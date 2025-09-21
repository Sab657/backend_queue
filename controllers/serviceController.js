const Service = require('../models/Service');
const Queue = require('../models/Queue');
const QRCode = require('qrcode');

// Get all services
const getAllServices = async (req, res, next) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    next(error);
  }
};

// Get service by ID (supports Mongo _id or legacy UUID in serviceId field)
const getServiceById = async (req, res, next) => {
  try {
    const rawId = req.params.id;
    let service = null;
    if (require('mongoose').Types.ObjectId.isValid(rawId)) {
      service = await Service.findById(rawId);
    }
    if (!service) {
      service = await Service.findOne({ serviceId: rawId });
    }

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// Create new service
const createService = async (req, res, next) => {
  try {
    // Resolve frontend base URL from env or request origin/host
    // Prefer explicit env; fallback to request origin (from frontend) or current host
    const origin = req.get('origin');
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const frontendBase = process.env.FRONTEND_BASE_URL || origin || hostUrl || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
    
    // Create service first to get Mongo _id
    const service = await Service.create({
      ...req.body,
    });

    // Build QR URL using Mongo _id
    const qrCodeUrl = `${frontendBase}/queue/${service._id}`;
    const qrCodeData = await QRCode.toDataURL(qrCodeUrl);
    service.qrCodeUrl = qrCodeUrl;
    service.qrCode = qrCodeData;
    await service.save();

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Service with this name already exists'
      });
    }
    next(error);
  }
};

// Update service
const updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    Object.assign(service, req.body);

    // If name changes, regenerate QR code
    if (req.body.name) {
      const origin = req.get('origin');
      const hostUrl = `${req.protocol}://${req.get('host')}`;
      const frontendBase = process.env.FRONTEND_BASE_URL || origin || hostUrl || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
      const qrTarget = `${frontendBase}/queue/${service._id}`;
      const qrCodeData = await QRCode.toDataURL(qrTarget);
      service.qrCode = qrCodeData;
      service.qrCodeUrl = qrTarget;
    }

    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// Delete service (soft delete)
const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Check active queues
    const activeQueues = await Queue.countDocuments({
      service: req.params.id,
      status: { $in: ['waiting', 'called', 'serving'] }
    });

    if (activeQueues > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service with active queues'
      });
    }

    service.isActive = false;
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get service statistics
const getServiceStats = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    const stats = await Queue.aggregate([
      { $match: { service: service._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const avgWaitTime = await Queue.aggregate([
      {
        $match: {
          service: service._id,
          status: 'completed',
          servedAt: { $exists: true },
          joinedAt: { $exists: true }
        }
      },
      {
        $project: {
          waitTime: {
            $divide: [
              { $subtract: ['$servedAt', '$joinedAt'] },
              60000
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgWaitTime: { $avg: '$waitTime' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        service: service.name,
        statistics: stats,
        averageWaitTime: avgWaitTime[0]?.avgWaitTime || 0,
        totalServed: service.totalServed || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceStats
};
