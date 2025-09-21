const Queue = require('../models/Queue');
const Service = require('../models/Service');
const moment = require('moment');
const mongoose = require('mongoose');

// Join queue via QR code scan
const joinQueue = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const { customerName, customerPhone, priority = 'normal' } = req.body;

    // Resolve service from either Mongo ObjectId or legacy UUID stored in serviceId field
    let service = null;
    if (mongoose.Types.ObjectId.isValid(serviceId)) {
      service = await Service.findById(serviceId);
    }
    if (!service) {
      service = await Service.findOne({ serviceId });
    }

    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or inactive'
      });
    }

    // Get next queue number
    const queueNumber = await Queue.getNextQueueNumber(service._id);

    // Create queue entry
    const queueEntry = await Queue.create({
      service: service._id,
      queueNumber,
      customerName,
      customerPhone,
      priority
    });

    await queueEntry.populate('service');

    // Emit real-time update
    req.io.to(`queue_${service._id}`).emit('queueUpdate', {
      type: 'NEW_QUEUE',
      data: queueEntry
    });

    res.status(201).json({
      success: true,
      message: 'Successfully joined the queue',
      data: {
        queueNumber: queueEntry.queueNumber,
        serviceName: service.name,
        estimatedWaitTime: queueEntry.estimatedWaitTime,
        position: await getQueuePosition(queueEntry._id),
        queueId: queueEntry._id
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get queue status
const getQueueStatus = async (req, res, next) => {
  try {
    const { queueId } = req.params;

    const queueEntry = await Queue.findById(queueId)
      .populate('service', 'name estimatedServiceTime');

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    const position = await getQueuePosition(queueId);
    const currentlyServing = await getCurrentlyServing(queueEntry.service._id);

    res.status(200).json({
      success: true,
      data: {
        queueNumber: queueEntry.queueNumber,
        status: queueEntry.status,
        serviceName: queueEntry.service.name,
        position: position,
        estimatedWaitTime: position * queueEntry.service.estimatedServiceTime,
        currentlyServing: currentlyServing,
        joinedAt: queueEntry.joinedAt,
        calledAt: queueEntry.calledAt,
        servedAt: queueEntry.servedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get service queue list (for admin/display)
const getServiceQueue = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const { status = 'waiting', page = 1, limit = 50 } = req.query;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    const skip = (page - 1) * limit;
    const statusArray = status.split(',');

    const queue = await Queue.find({
      service: serviceId,
      status: { $in: statusArray }
    })
      .sort({ priority: -1, joinedAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('service', 'name');

    const total = await Queue.countDocuments({
      service: serviceId,
      status: { $in: statusArray }
    });

    res.status(200).json({
      success: true,
      data: {
        serviceName: service.name,
        queue,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalCount: total
      }
    });
  } catch (error) {
    next(error);
  }
};

// Call next in queue
const callNext = async (req, res, next) => {
  try {
    const { serviceId } = req.params;

    // Find the next person in queue (priority first, then FIFO)
    const nextInQueue = await Queue.findOne({
      service: serviceId,
      status: 'waiting'
    })
      .sort({ priority: -1, joinedAt: 1 })
      .populate('service');

    if (!nextInQueue) {
      return res.status(404).json({
        success: false,
        message: 'No one in queue'
      });
    }

    // Update status to called
    await nextInQueue.updateStatus('called');

    // Emit real-time update
    req.io.to(`queue_${serviceId}`).emit('queueUpdate', {
      type: 'QUEUE_CALLED',
      data: {
        queueNumber: nextInQueue.queueNumber,
        customerName: nextInQueue.customerName
      }
    });

    res.status(200).json({
      success: true,
      message: 'Next customer called',
      data: {
        queueNumber: nextInQueue.queueNumber,
        customerName: nextInQueue.customerName,
        serviceName: nextInQueue.service.name
      }
    });
  } catch (error) {
    next(error);
  }
};

// Mark customer as serving
const markServing = async (req, res, next) => {
  try {
    const { queueId } = req.params;

    const queueEntry = await Queue.findById(queueId).populate('service');

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    if (queueEntry.status !== 'called') {
      return res.status(400).json({
        success: false,
        message: 'Customer must be called first'
      });
    }

    await queueEntry.updateStatus('serving');

    // Emit real-time update
    req.io.to(`queue_${queueEntry.service._id}`).emit('queueUpdate', {
      type: 'QUEUE_SERVING',
      data: queueEntry
    });

    res.status(200).json({
      success: true,
      message: 'Customer marked as being served',
      data: queueEntry
    });
  } catch (error) {
    next(error);
  }
};

// Complete service
const completeService = async (req, res, next) => {
  try {
    const { queueId } = req.params;
    const { notes } = req.body;

    const queueEntry = await Queue.findById(queueId).populate('service');

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    if (queueEntry.status !== 'serving') {
      return res.status(400).json({
        success: false,
        message: 'Service must be in progress to complete'
      });
    }

    queueEntry.notes = notes;
    await queueEntry.updateStatus('completed');

    // Update service statistics
    await Service.findByIdAndUpdate(queueEntry.service._id, {
      $inc: { totalServed: 1 }
    });

    // Emit real-time update
    req.io.to(`queue_${queueEntry.service._id}`).emit('queueUpdate', {
      type: 'QUEUE_COMPLETED',
      data: queueEntry
    });

    res.status(200).json({
      success: true,
      message: 'Service completed successfully',
      data: queueEntry
    });
  } catch (error) {
    next(error);
  }
};

// Cancel queue entry
const cancelQueue = async (req, res, next) => {
  try {
    const { queueId } = req.params;
    const { reason } = req.body;

    const queueEntry = await Queue.findById(queueId).populate('service');

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: 'Queue entry not found'
      });
    }

    if (['completed', 'cancelled'].includes(queueEntry.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed or already cancelled queue entry'
      });
    }

    queueEntry.notes = reason;
    await queueEntry.updateStatus('cancelled');

    // Emit real-time update
    req.io.to(`queue_${queueEntry.service._id}`).emit('queueUpdate', {
      type: 'QUEUE_CANCELLED',
      data: queueEntry
    });

    res.status(200).json({
      success: true,
      message: 'Queue entry cancelled successfully',
      data: queueEntry
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
const getQueuePosition = async (queueId) => {
  const queueEntry = await Queue.findById(queueId);
  if (!queueEntry) return 0;

  const position = await Queue.countDocuments({
    service: queueEntry.service,
    status: 'waiting',
    $or: [
      { priority: { $gt: queueEntry.priority } },
      { 
        priority: queueEntry.priority,
        joinedAt: { $lt: queueEntry.joinedAt }
      }
    ]
  });

  return position + 1;
};

const getCurrentlyServing = async (serviceId) => {
  return await Queue.findOne({
    service: serviceId,
    status: { $in: ['called', 'serving'] }
  }).select('queueNumber customerName status');
};

module.exports = {
  joinQueue,
  getQueueStatus,
  getServiceQueue,
  callNext,
  markServing,
  completeService,
  cancelQueue
};