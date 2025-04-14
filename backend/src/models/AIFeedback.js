const mongoose = require('mongoose');

const aiFeedbackSchema = new mongoose.Schema({
  predictionType: {
    type: String,
    required: true,
    enum: ['visit_duration', 'task_assignment', 'bottleneck', 'scheduling']
  },
  actualOutcome: mongoose.Schema.Types.Mixed,
  predictedOutcome: mongoose.Schema.Types.Mixed,
  accuracy: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  userFeedback: {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comments: String,
    tags: [String]
  },
  context: {
    userId: mongoose.Schema.Types.ObjectId,
    departmentId: mongoose.Schema.Types.ObjectId,
    metadata: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  analysisResults: {
    patterns: [String],
    insights: [String],
    suggestedAdjustments: [String]
  }
}, {
  timestamps: true
});

// Index for efficient querying
aiFeedbackSchema.index({ predictionType: 1, timestamp: -1 });
aiFeedbackSchema.index({ 'context.userId': 1 });
aiFeedbackSchema.index({ 'context.departmentId': 1 });
aiFeedbackSchema.index({ accuracy: 1 });

// Methods for feedback analysis
aiFeedbackSchema.statics.getAccuracyTrend = async function(predictionType, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  return this.aggregate([
    {
      $match: {
        predictionType,
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$timestamp'
          }
        },
        averageAccuracy: { $avg: '$accuracy' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

aiFeedbackSchema.statics.getCommonPatterns = async function(predictionType, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  return this.aggregate([
    {
      $match: {
        predictionType,
        timestamp: { $gte: startDate },
        'analysisResults.patterns': { $exists: true }
      }
    },
    {
      $unwind: '$analysisResults.patterns'
    },
    {
      $group: {
        _id: '$analysisResults.patterns',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 10
    }
  ]);
};

aiFeedbackSchema.statics.getUserFeedbackSummary = async function(predictionType, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  return this.aggregate([
    {
      $match: {
        predictionType,
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$userFeedback.rating' },
        totalFeedback: { $sum: 1 },
        commonTags: {
          $push: '$userFeedback.tags'
        }
      }
    },
    {
      $project: {
        _id: 0,
        averageRating: 1,
        totalFeedback: 1,
        commonTags: {
          $reduce: {
            input: '$commonTags',
            initialValue: [],
            in: { $setUnion: ['$$value', '$$this'] }
          }
        }
      }
    }
  ]);
};

aiFeedbackSchema.statics.getDepartmentPerformance = async function(departmentId, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  return this.aggregate([
    {
      $match: {
        'context.departmentId': departmentId,
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$predictionType',
        averageAccuracy: { $avg: '$accuracy' },
        totalPredictions: { $sum: 1 },
        averageRating: { $avg: '$userFeedback.rating' }
      }
    }
  ]);
};

const AIFeedback = mongoose.model('AIFeedback', aiFeedbackSchema);

module.exports = AIFeedback; 