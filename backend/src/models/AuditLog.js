const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'user_login', 'user_logout', 'user_create', 'user_update', 'user_delete',
      'patient_create', 'patient_update', 'patient_delete',
      'diagnosis_create', 'diagnosis_update',
      'feedback_submit', 'feedback_update',
      'note_create', 'note_update', 'note_delete',
      'medical_record_access'
    ],
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['user', 'patient', 'diagnosis', 'feedback', 'note', 'medical_record'],
    index: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  details: {
    type: mongoose.Schema.Schema.Types.Mixed,
    required: true
  },
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failure', 'error'],
    default: 'success'
  },
  errorDetails: String,
  metadata: {
    sessionId: String,
    requestId: String,
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'production'
    }
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

// Static method to get activity statistics
auditLogSchema.statics.getActivityStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.action',
        total: { $sum: '$count' },
        statusBreakdown: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        }
      }
    }
  ]);
};

// Static method to get user activity summary
auditLogSchema.statics.getUserActivitySummary = async function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastActivity: { $max: '$createdAt' }
      }
    },
    {
      $sort: { lastActivity: -1 }
    }
  ]);
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog; 