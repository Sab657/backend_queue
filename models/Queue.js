const mongoose = require('mongoose');
const moment = require('moment');

const queueSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service is required']
  },
  // The logical day this ticket belongs to (YYYY-MM-DD)
  queueDate: {
    type: String,
    required: true,
    index: true
  },
  queueNumber: {
    type: Number,
    required: [true, 'Queue number is required']
  },
  customerName: {
    type: String,
    trim: true,
    maxLength: [100, 'Customer name cannot exceed 100 characters']
  },
  customerPhone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
  },
  status: {
    type: String,
    enum: {
      values: ['waiting', 'called', 'serving', 'completed', 'cancelled', 'no-show'],
      message: 'Status must be one of: waiting, called, serving, completed, cancelled, no-show'
    },
    default: 'waiting'
  },
  priority: {
    type: String,
    enum: {
      values: ['normal', 'priority', 'urgent'],
      message: 'Priority must be one of: normal, priority, urgent'
    },
    default: 'normal'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  calledAt: {
    type: Date
  },
  servedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  estimatedWaitTime: {
    type: Number // in minutes
  },
  notes: {
    type: String,
    maxLength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Index for efficient queries
queueSchema.index({ service: 1, status: 1, joinedAt: 1 });
// Ensure uniqueness per service per day
queueSchema.index({ service: 1, queueDate: 1, queueNumber: 1 }, { unique: true });

// Set queueDate based on joinedAt or current time
queueSchema.pre('validate', function(next) {
  if (!this.queueDate) {
    const base = this.joinedAt ? moment(this.joinedAt) : moment();
    this.queueDate = base.format('YYYY-MM-DD');
  }
  next();
});

// Calculate estimated wait time before saving
queueSchema.pre('save', async function(next) {
  if (this.isNew && this.status === 'waiting') {
    try {
      const Service = mongoose.model('Service');
      const service = await Service.findById(this.service);
      
      if (service) {
        const waitingCount = await this.constructor.countDocuments({
          service: this.service,
          status: 'waiting',
          joinedAt: { $lt: this.joinedAt }
        });
        
        this.estimatedWaitTime = waitingCount * service.estimatedServiceTime;
      }
    } catch (error) {
      console.error('Error calculating wait time:', error);
    }
  }
  next();
});

// Static method to get next queue number (per service, per day)
queueSchema.statics.getNextQueueNumber = async function(serviceId) {
  const today = moment().format('YYYY-MM-DD');
  const lastQueueToday = await this.findOne({ service: serviceId, queueDate: today })
    .sort({ queueNumber: -1 })
    .lean();

  return lastQueueToday ? lastQueueToday.queueNumber + 1 : 1;
};

// Instance method to update status with timestamp
queueSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  
  switch (newStatus) {
    case 'called':
      this.calledAt = new Date();
      break;
    case 'serving':
      this.servedAt = new Date();
      break;
    case 'completed':
      this.completedAt = new Date();
      break;
  }
  
  return this.save();
};

module.exports = mongoose.model('Queue', queueSchema);