const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxLength: [100, 'Service name cannot exceed 100 characters']
    // ❌ removed unique: true to allow duplicates
  },
  description: {
    type: String,
    trim: true,
    maxLength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  estimatedServiceTime: {
    type: Number, // in minutes
    default: 5,
    min: [1, 'Service time must be at least 1 minute']
  },
  qrCode: {
    type: String // Base64 encoded QR code
  },
  qrCodeUrl: {
    type: String // URL for the QR code
  },
  currentNumber: {
    type: Number,
    default: 0
  },
  totalServed: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false // ✅ soft delete flag
  }
}, {
  timestamps: true
});

// Generate QR code URL before saving
serviceSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('name')) {
    this.qrCodeUrl = `${process.env.QR_BASE_URL}/${this._id}`;
  }
  next();
});

// Virtual for current queue count
serviceSchema.virtual('currentQueueCount', {
  ref: 'Queue',
  localField: '_id',
  foreignField: 'service',
  count: true,
  match: { status: { $in: ['waiting', 'called'] } }
});

serviceSchema.set('toJSON', { virtuals: true });
serviceSchema.set('toObject', { virtuals: true });

// Optional: If you want only one "active" service per name, uncomment below
// serviceSchema.index({ name: 1, isDeleted: 1 }, { unique: true });

module.exports = mongoose.model('Service', serviceSchema);
