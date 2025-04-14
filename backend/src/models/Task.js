const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['todo', 'in_progress', 'completed'],
    default: 'todo'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [{
    type: String,
    trim: true
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['patient_care', 'admin', 'lab', 'medication', 'consultation', 'other']
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  urgencyLevel: {
    type: String,
    required: true,
    enum: ['routine', 'urgent', 'emergency'],
    default: 'routine'
  },
  estimatedDuration: {
    type: Number,
    required: true,
    min: 5
  },
  recurring: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    time: String,
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }]
  },
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  completionNotes: String,
  attachments: [{
    name: String,
    type: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  checklist: [{
    text: {
      type: String,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskTemplate'
  },
  history: [{
    action: {
      type: String,
      required: true,
      enum: ['created', 'updated', 'status_changed', 'assigned', 'completed']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ patientId: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ department: 1, category: 1 });
taskSchema.index({ 'recurring.frequency': 1, status: 1 });
taskSchema.index({ title: 'text', description: 'text' });

// Pre-save middleware to update history
taskSchema.pre('save', function(next) {
  if (this.isNew) {
    this.history.push({
      action: 'created',
      performedBy: this.createdBy,
      details: {
        title: this.title,
        description: this.description
      }
    });
  }
  next();
});

// Method to add history entry
taskSchema.methods.addHistoryEntry = function(action, performedBy, details) {
  this.history.push({
    action,
    performedBy,
    details,
    timestamp: new Date()
  });
};

// Virtual for time until due
taskSchema.virtual('timeUntilDue').get(function() {
  return this.dueDate ? this.dueDate.getTime() - Date.now() : null;
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.status !== 'completed' && this.dueDate && this.dueDate.getTime() < Date.now();
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task; 