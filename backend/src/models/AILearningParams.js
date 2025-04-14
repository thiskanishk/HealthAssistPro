const mongoose = require('mongoose');

const aiLearningParamsSchema = new mongoose.Schema({
  predictionType: {
    type: String,
    required: true,
    enum: ['visit_duration', 'task_assignment', 'bottleneck', 'scheduling']
  },
  weights: {
    type: Map,
    of: Number,
    required: true
  },
  thresholds: {
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    errorTolerance: {
      type: Number,
      required: true,
      min: 0
    }
  },
  factorImportance: {
    type: Map,
    of: Number,
    required: true
  },
  adjustmentHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    changes: {
      weights: {
        type: Map,
        of: Number
      },
      thresholds: {
        confidence: Number,
        accuracy: Number,
        errorTolerance: Number
      },
      factorImportance: {
        type: Map,
        of: Number
      }
    },
    reason: String,
    performanceImpact: {
      accuracyDelta: Number,
      confidenceDelta: Number
    }
  }],
  metadata: {
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    },
    totalUpdates: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
aiLearningParamsSchema.index({ predictionType: 1 });
aiLearningParamsSchema.index({ 'metadata.lastUpdated': -1 });

// Methods for parameter management
aiLearningParamsSchema.statics.getCurrentParams = async function(predictionType) {
  return this.findOne({ predictionType }).sort({ 'metadata.version': -1 });
};

aiLearningParamsSchema.statics.getParamHistory = async function(predictionType, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  return this.aggregate([
    {
      $match: {
        predictionType,
        'adjustmentHistory.timestamp': { $gte: startDate }
      }
    },
    {
      $unwind: '$adjustmentHistory'
    },
    {
      $match: {
        'adjustmentHistory.timestamp': { $gte: startDate }
      }
    },
    {
      $sort: {
        'adjustmentHistory.timestamp': 1
      }
    },
    {
      $group: {
        _id: '$predictionType',
        adjustments: {
          $push: '$adjustmentHistory'
        },
        totalAdjustments: { $sum: 1 },
        averageAccuracyDelta: { $avg: '$adjustmentHistory.performanceImpact.accuracyDelta' },
        averageConfidenceDelta: { $avg: '$adjustmentHistory.performanceImpact.confidenceDelta' }
      }
    }
  ]);
};

aiLearningParamsSchema.methods.applyAdjustments = async function(adjustments, reason) {
  // Apply weight adjustments
  if (adjustments.weights) {
    for (const [key, delta] of Object.entries(adjustments.weights)) {
      const currentWeight = this.weights.get(key) || 0;
      this.weights.set(key, currentWeight + delta);
    }
  }

  // Apply threshold adjustments
  if (adjustments.thresholds) {
    for (const [key, delta] of Object.entries(adjustments.thresholds)) {
      this.thresholds[key] = Math.max(0, Math.min(
        key === 'confidence' ? 1 : 100,
        this.thresholds[key] + delta
      ));
    }
  }

  // Apply factor importance adjustments
  if (adjustments.factorImportance) {
    for (const [key, delta] of Object.entries(adjustments.factorImportance)) {
      const currentImportance = this.factorImportance.get(key) || 0;
      this.factorImportance.set(key, currentImportance + delta);
    }
  }

  // Record adjustment in history
  this.adjustmentHistory.push({
    timestamp: new Date(),
    changes: adjustments,
    reason,
    performanceImpact: {
      accuracyDelta: 0, // To be updated after measuring impact
      confidenceDelta: 0
    }
  });

  // Update metadata
  this.metadata.lastUpdated = new Date();
  this.metadata.totalUpdates += 1;
  this.metadata.version += 1;

  return this.save();
};

const AILearningParams = mongoose.model('AILearningParams', aiLearningParamsSchema);

module.exports = AILearningParams; 