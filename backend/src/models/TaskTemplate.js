const mongoose = require('mongoose');

const taskTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['patient_care', 'admin', 'lab', 'medication', 'consultation', 'other']
  },
  description: {
    type: String,
    required: true
  },
  estimatedDuration: {
    type: Number,
    required: true,
    min: 5
  },
  priority: {
    type: String,
    required: true,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  checklist: [{
    text: {
      type: String,
      required: true
    },
    required: {
      type: Boolean,
      default: false
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
taskTemplateSchema.index({ category: 1, department: 1, isActive: 1 });
taskTemplateSchema.index({ name: 'text', description: 'text' });

const TaskTemplate = mongoose.model('TaskTemplate', taskTemplateSchema);

module.exports = TaskTemplate; 