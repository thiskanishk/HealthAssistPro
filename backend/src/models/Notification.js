const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'task_assignment',
      'task_update',
      'deadline_reminder',
      'workload_alert',
      'department_announcement',
      'emergency_alert',
      'system_update',
      'appointment_reminder',
      'test_results',
      'medication_reminder'
    ]
  },
  category: {
    type: String,
    required: true,
    enum: [
      'tasks',
      'appointments',
      'system',
      'alerts',
      'reminders',
      'medical'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  group: {
    type: String,
    default: 'general'
  },
  sound: {
    type: {
      type: String,
      enum: ['default', 'alert', 'reminder', 'success', 'error']
    },
    volume: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for querying unread notifications
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Index for querying notifications by type and category
notificationSchema.index({ userId: 1, type: 1, category: 1 });

// Methods
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  this.readAt = new Date();
  await this.save();
};

// Statics
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, read: false });
};

notificationSchema.statics.getNotificationsByGroup = async function(userId, group, limit = 20) {
  return this.find({ userId, group })
    .sort({ createdAt: -1 })
    .limit(limit);
};

notificationSchema.statics.clearOldNotifications = async function(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  return this.deleteMany({
    createdAt: { $lt: date },
    read: true
  });
};

// Pre-save middleware to set category based on type if not provided
notificationSchema.pre('save', function(next) {
  if (!this.category) {
    switch (this.type) {
      case 'task_assignment':
      case 'task_update':
        this.category = 'tasks';
        break;
      case 'appointment_reminder':
        this.category = 'appointments';
        break;
      case 'system_update':
        this.category = 'system';
        break;
      case 'emergency_alert':
      case 'workload_alert':
        this.category = 'alerts';
        break;
      case 'deadline_reminder':
      case 'medication_reminder':
        this.category = 'reminders';
        break;
      case 'test_results':
        this.category = 'medical';
        break;
      default:
        this.category = 'system';
    }
  }
  next();
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 