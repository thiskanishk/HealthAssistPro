const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['error', 'warning', 'info'],
    required: true
  },
  category: {
    type: String,
    enum: ['auth', 'access', 'system', 'data'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  metadata: {
    userAgent: String,
    blocked: {
      type: Boolean,
      default: false
    },
    location: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ type: 1, category: 1 });
securityEventSchema.index({ ipAddress: 1 });
securityEventSchema.index({ userId: 1 });

// Method to format event for API response
securityEventSchema.methods.toJSON = function() {
  const event = this.toObject();
  delete event.__v;
  return event;
};

const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);

module.exports = SecurityEvent; 