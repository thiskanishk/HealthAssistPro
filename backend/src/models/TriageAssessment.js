const mongoose = require('mongoose');

const triageAssessmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  symptoms: [{
    name: { type: String, required: true },
    severity: { type: Number, min: 1, max: 10, required: true },
    duration: { type: String, required: true }
  }],
  vitalSigns: {
    temperature: { type: Number },
    heartRate: { type: Number },
    bloodPressure: {
      systolic: { type: Number },
      diastolic: { type: Number }
    },
    respiratoryRate: { type: Number },
    oxygenSaturation: { type: Number }
  },
  aiAssessment: {
    triageLevel: {
      type: String,
      enum: ['immediate', 'emergency', 'urgent', 'semi-urgent', 'non-urgent'],
      required: true
    },
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    recommendedAction: {
      type: String,
      required: true
    },
    estimatedWaitTime: Number,
    potentialDiagnoses: [{
      condition: String,
      probability: Number
    }]
  },
  medicalHistory: {
    relevantConditions: [String],
    allergies: [String],
    medications: [String]
  },
  riskFactors: [{
    factor: String,
    impact: {
      type: String,
      enum: ['high', 'medium', 'low']
    }
  }],
  nurseReview: {
    reviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    adjustedTriageLevel: {
      type: String,
      enum: ['immediate', 'emergency', 'urgent', 'semi-urgent', 'non-urgent']
    },
    notes: String
  },
  status: {
    type: String,
    enum: ['pending', 'in_review', 'completed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
triageAssessmentSchema.index({ 'aiAssessment.triageLevel': 1, status: 1 });
triageAssessmentSchema.index({ 'nurseReview.reviewed': 1, status: 1 });

// Method to calculate triage score based on symptoms and vitals
triageAssessmentSchema.methods.calculateTriageScore = function() {
  let score = 0;
  
  // Add symptom severity scores
  this.symptoms.forEach(symptom => {
    score += symptom.severity;
  });
  
  // Check vital signs against normal ranges
  const vitals = this.vitalSigns;
  if (vitals.temperature > 38.5 || vitals.temperature < 35) score += 3;
  if (vitals.heartRate > 100 || vitals.heartRate < 60) score += 2;
  if (vitals.bloodPressure.systolic > 140 || vitals.bloodPressure.systolic < 90) score += 2;
  if (vitals.respiratoryRate > 20 || vitals.respiratoryRate < 12) score += 3;
  if (vitals.oxygenSaturation < 95) score += 3;
  
  return score;
};

// Method to get patients requiring immediate attention
triageAssessmentSchema.statics.getHighPriorityPatients = function() {
  return this.find({
    'aiAssessment.triageLevel': { $in: ['immediate', 'emergency'] },
    'status': { $ne: 'completed' }
  })
  .populate('patientId')
  .sort({ 'timestamp': -1 });
};

// Method to get average wait times by triage level
triageAssessmentSchema.statics.getAverageWaitTimes = function() {
  return this.aggregate([
    {
      $match: { status: 'completed' }
    },
    {
      $group: {
        _id: '$aiAssessment.triageLevel',
        averageWaitTime: { $avg: '$aiAssessment.estimatedWaitTime' }
      }
    }
  ]);
};

const TriageAssessment = mongoose.model('TriageAssessment', triageAssessmentSchema);

module.exports = TriageAssessment; 