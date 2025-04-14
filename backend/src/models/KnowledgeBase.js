const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  icd10Code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  specialty: {
    type: String,
    required: true,
    enum: ['Cardiology', 'Neurology', 'Pediatrics', 'Gynecology', 'Orthopedics', 
           'Dermatology', 'Psychiatry', 'Oncology', 'General'],
    index: true
  },
  description: {
    type: String,
    required: true
  },
  symptoms: [{
    name: String,
    description: String,
    commonality: {
      type: String,
      enum: ['very_common', 'common', 'uncommon', 'rare']
    }
  }],
  commonTreatments: [{
    name: String,
    type: {
      type: String,
      enum: ['medication', 'procedure', 'lifestyle', 'therapy']
    },
    description: String,
    rxNormCode: String // For medications only
  }],
  riskFactors: [{
    factor: String,
    impact: {
      type: String,
      enum: ['high', 'medium', 'low']
    }
  }],
  preventiveMeasures: [String],
  complications: [{
    condition: String,
    severity: {
      type: String,
      enum: ['severe', 'moderate', 'mild']
    },
    description: String
  }],
  references: [{
    title: String,
    url: String,
    publishedDate: Date
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
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Text index for search functionality
knowledgeBaseSchema.index({
  name: 'text',
  'symptoms.name': 'text',
  description: 'text'
});

// Method to get related conditions
knowledgeBaseSchema.methods.getRelatedConditions = async function() {
  return this.model('KnowledgeBase').find({
    specialty: this.specialty,
    _id: { $ne: this._id }
  }).limit(5);
};

const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema);

module.exports = KnowledgeBase; 