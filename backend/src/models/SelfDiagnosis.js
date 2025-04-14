const mongoose = require('mongoose');

const selfDiagnosisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symptoms: [{
    type: String,
    required: true
  }],
  vitals: {
    temperature: Number,
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    oxygenSaturation: Number
  },
  aiDiagnosis: {
    conditions: [{
      name: String,
      confidence: Number,
      description: String,
      treatments: [String]
    }],
    rawResponse: String
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SelfDiagnosis', selfDiagnosisSchema); 