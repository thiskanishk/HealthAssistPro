const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  diagnosis: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Diagnosis',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxLength: 1000
  },
  accuracy: {
    wasCorrect: Boolean,
    actualCondition: String,
    actualICD10: String
  },
  usefulnessScore: {
    type: Number,
    min: 1,
    max: 5
  },
  treatmentEffectiveness: {
    type: String,
    enum: ['very_effective', 'somewhat_effective', 'not_effective', 'not_implemented', 'unknown']
  },
  suggestedImprovements: [String],
  metadata: {
    browserInfo: String,
    responseTime: Number, // Time taken for AI to generate diagnosis
    diagnosisVersion: String // Version of the AI model used
  }
}, {
  timestamps: true
});

// Index for aggregation queries
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ rating: 1, createdAt: -1 });

// Static method to get feedback statistics
feedbackSchema.statics.getStatistics = async function(startDate, endDate) {
  const match = {
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  };

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalFeedback: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        },
        accuracyRate: {
          $avg: { $cond: ['$accuracy.wasCorrect', 1, 0] }
        },
        averageResponseTime: { $avg: '$metadata.responseTime' }
      }
    },
    {
      $project: {
        _id: 0,
        averageRating: { $round: ['$averageRating', 2] },
        totalFeedback: 1,
        ratingDistribution: 1,
        accuracyRate: { $round: ['$accuracyRate', 2] },
        averageResponseTime: { $round: ['$averageResponseTime', 2] }
      }
    }
  ]);
};

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback; 