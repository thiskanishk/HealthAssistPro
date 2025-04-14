const mongoose = require('mongoose');

const taskSchedulerSchema = new mongoose.Schema({
  taskTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskTemplate',
    required: true
  },
  schedule: {
    frequency: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'custom']
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,
    time: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: 'Time must be in HH:mm format'
      }
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    interval: {
      type: Number,
      min: 1,
      default: 1
    },
    customPattern: {
      type: String,
      validate: {
        validator: function(v) {
          return this.frequency !== 'custom' || (v && v.trim().length > 0);
        },
        message: 'Custom pattern is required for custom frequency'
      }
    }
  },
  department: {
    type: String,
    required: true
  },
  assignTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastRun: Date,
  nextRun: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    notes: String,
    tags: [String]
  },
  executionHistory: [{
    scheduledTime: Date,
    actualExecutionTime: Date,
    status: {
      type: String,
      enum: ['success', 'failed', 'skipped'],
      required: true
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    error: String
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
taskSchedulerSchema.index({ 'schedule.frequency': 1, isActive: 1 });
taskSchedulerSchema.index({ nextRun: 1, isActive: 1 });
taskSchedulerSchema.index({ department: 1, isActive: 1 });
taskSchedulerSchema.index({ patientId: 1, isActive: 1 });

// Pre-save middleware to calculate next run
taskSchedulerSchema.pre('save', function(next) {
  if (this.isActive && (!this.nextRun || this.isModified('schedule'))) {
    this.calculateNextRun();
  }
  next();
});

// Method to calculate next run date
taskSchedulerSchema.methods.calculateNextRun = function() {
  const now = new Date();
  let nextRun = new Date(this.schedule.startDate);
  const [hours, minutes] = this.schedule.time.split(':').map(Number);
  
  nextRun.setHours(hours, minutes, 0, 0);

  if (nextRun < now) {
    switch (this.schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + this.schedule.interval);
        break;
      case 'weekly':
        if (this.schedule.daysOfWeek && this.schedule.daysOfWeek.length > 0) {
          // Find next available day
          let found = false;
          while (!found) {
            nextRun.setDate(nextRun.getDate() + 1);
            if (this.schedule.daysOfWeek.includes(nextRun.getDay())) {
              found = true;
            }
          }
        } else {
          nextRun.setDate(nextRun.getDate() + (7 * this.schedule.interval));
        }
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + this.schedule.interval);
        break;
      case 'custom':
        // Custom pattern handling would go here
        // For now, default to next day
        nextRun.setDate(nextRun.getDate() + 1);
        break;
    }
  }

  // Check if we've passed the end date
  if (this.schedule.endDate && nextRun > this.schedule.endDate) {
    this.isActive = false;
    this.nextRun = null;
  } else {
    this.nextRun = nextRun;
  }
};

// Method to record execution
taskSchedulerSchema.methods.recordExecution = async function(status, taskId = null, error = null) {
  this.lastRun = new Date();
  this.executionHistory.push({
    scheduledTime: this.nextRun,
    actualExecutionTime: this.lastRun,
    status,
    taskId,
    error
  });

  if (this.isActive) {
    this.calculateNextRun();
  }

  return this.save();
};

const TaskScheduler = mongoose.model('TaskScheduler', taskSchedulerSchema);

module.exports = TaskScheduler; 