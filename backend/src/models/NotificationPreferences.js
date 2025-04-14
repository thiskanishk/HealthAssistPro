const mongoose = require('mongoose');

const notificationPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  emailNotifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['immediate', 'hourly', 'daily', 'weekly'],
      default: 'immediate'
    }
  },
  pushNotifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    sound: {
      enabled: {
        type: Boolean,
        default: true
      },
      volume: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.7
      }
    },
    vibration: {
      type: Boolean,
      default: true
    }
  },
  categories: {
    tasks: {
      enabled: { type: Boolean, default: true },
      priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'low' }
    },
    appointments: {
      enabled: { type: Boolean, default: true },
      priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' }
    },
    system: {
      enabled: { type: Boolean, default: true },
      priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'low' }
    },
    alerts: {
      enabled: { type: Boolean, default: true },
      priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'high' }
    },
    reminders: {
      enabled: { type: Boolean, default: true },
      priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' }
    },
    medical: {
      enabled: { type: Boolean, default: true },
      priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'high' }
    }
  },
  groups: [{
    name: {
      type: String,
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    sound: {
      type: String,
      enum: ['default', 'alert', 'reminder', 'success', 'error'],
      default: 'default'
    }
  }],
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    start: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: '22:00'
    },
    end: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: '07:00'
    },
    allowUrgent: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Methods
notificationPreferencesSchema.methods.isQuietHours = function() {
  if (!this.quietHours.enabled) return false;

  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                     now.getMinutes().toString().padStart(2, '0');
  
  const start = this.quietHours.start;
  const end = this.quietHours.end;
  
  if (start <= end) {
    return currentTime >= start && currentTime <= end;
  } else {
    // Handle case where quiet hours span midnight
    return currentTime >= start || currentTime <= end;
  }
};

notificationPreferencesSchema.methods.shouldReceiveNotification = function(category, priority) {
  if (!this.enabled) return false;
  if (!this.categories[category]?.enabled) return false;
  
  const isQuietHours = this.isQuietHours();
  if (isQuietHours) {
    if (!this.quietHours.allowUrgent) return false;
    if (priority !== 'urgent') return false;
  }
  
  const categoryPriority = this.categories[category].priority;
  const priorityLevels = ['low', 'medium', 'high', 'urgent'];
  const categoryPriorityIndex = priorityLevels.indexOf(categoryPriority);
  const notificationPriorityIndex = priorityLevels.indexOf(priority);
  
  return notificationPriorityIndex >= categoryPriorityIndex;
};

notificationPreferencesSchema.methods.getGroupPreferences = function(groupName) {
  const group = this.groups.find(g => g.name === groupName);
  return group || {
    name: groupName,
    enabled: true,
    priority: 'medium',
    sound: 'default'
  };
};

// Statics
notificationPreferencesSchema.statics.getDefaultPreferences = async function(userId) {
  return new this({
    userId,
    groups: [{
      name: 'general',
      enabled: true,
      priority: 'medium',
      sound: 'default'
    }]
  });
};

const NotificationPreferences = mongoose.model('NotificationPreferences', notificationPreferencesSchema);

module.exports = NotificationPreferences; 