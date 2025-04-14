const mongoose = require('mongoose');

const telemedicineSessionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    default: 30, // Duration in minutes
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  type: {
    type: String,
    enum: ['initial', 'follow_up', 'consultation'],
    required: true
  },
  notes: {
    type: String
  },
  estimatedWaitTime: {
    type: Number,
    default: 0 // Wait time in minutes
  },
  recordingUrl: {
    type: String
  },
  technicalIssues: [{
    type: {
      type: String,
      enum: ['audio', 'video', 'connection', 'other']
    },
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  vitals: [{
    type: {
      type: String,
      enum: ['temperature', 'heart_rate', 'blood_pressure', 'respiratory_rate', 'oxygen_saturation']
    },
    value: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  prescription: {
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      notes: String
    }],
    issuedAt: {
      type: Date,
      default: Date.now
    }
  },
  followUp: {
    recommended: {
      type: Boolean,
      default: false
    },
    date: Date,
    notes: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
telemedicineSessionSchema.index({ patientId: 1, dateTime: -1 });
telemedicineSessionSchema.index({ doctorId: 1, dateTime: -1 });
telemedicineSessionSchema.index({ status: 1, dateTime: 1 });

// Virtual for session URL
telemedicineSessionSchema.virtual('sessionUrl').get(function() {
  return `/telemedicine/session/${this._id}`;
});

// Method to check if session can be started
telemedicineSessionSchema.methods.canStart = function() {
  const now = new Date();
  const sessionTime = new Date(this.dateTime);
  const timeDiff = Math.abs(now - sessionTime);
  return timeDiff <= 15 * 60 * 1000; // Within 15 minutes of scheduled time
};

// Method to add technical issue
telemedicineSessionSchema.methods.addTechnicalIssue = function(type, description) {
  this.technicalIssues.push({ type, description });
  return this.save();
};

// Method to update vital signs
telemedicineSessionSchema.methods.updateVitals = function(type, value) {
  this.vitals.push({ type, value });
  return this.save();
};

// Method to complete session
telemedicineSessionSchema.methods.complete = function(notes, prescription, followUp) {
  this.status = 'completed';
  if (notes) this.notes = notes;
  if (prescription) this.prescription = prescription;
  if (followUp) this.followUp = followUp;
  return this.save();
};

// Static method to find upcoming sessions
telemedicineSessionSchema.statics.findUpcoming = function(userId, role = 'patient') {
  const query = {
    [role === 'patient' ? 'patientId' : 'doctorId']: userId,
    status: 'scheduled',
    dateTime: { $gte: new Date() }
  };
  return this.find(query).sort('dateTime');
};

const TelemedicineSession = mongoose.model('TelemedicineSession', telemedicineSessionSchema);

module.exports = TelemedicineSession; 