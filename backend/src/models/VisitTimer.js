const mongoose = require('mongoose');
const visitPrediction = require('../services/visitPrediction');

const visitTimerSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentType: {
    type: String,
    required: true,
    enum: ['consultation', 'followUp', 'procedure', 'emergency', 'routine']
  },
  scheduledStartTime: {
    type: Date,
    required: true
  },
  predictedDuration: {
    type: Number,
    required: true
  },
  actualStartTime: Date,
  actualEndTime: Date,
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  aiPrediction: {
    duration: Number,
    confidence: Number,
    factors: [String],
    considerations: [String]
  },
  schedulingMetadata: {
    recommendedSlot: {
      time: String,
      score: Number
    },
    reasoning: [String],
    impactConsiderations: [String]
  },
  notes: String,
  complexity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  duration: {
    type: Number, // in seconds
    required: true
  },
  overTime: {
    type: Boolean,
    default: false
  },
  visitType: {
    type: String,
    enum: ['routine', 'follow-up', 'emergency', 'consultation'],
    default: 'routine'
  },
  recommendedDuration: {
    type: Number, // in minutes
    default: 15
  },
  interruptions: [{
    startTime: Date,
    endTime: Date,
    reason: String
  }],
  activities: [{
    type: String,
    enum: [
      'examination',
      'consultation',
      'prescription',
      'procedure',
      'documentation',
      'other'
    ]
  }],
  metrics: {
    waitTime: Number, // in minutes
    roomNumber: String,
    efficiency: {
      type: Number,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
visitTimerSchema.index({ patientId: 1, startTime: -1 });
visitTimerSchema.index({ providerId: 1, startTime: -1 });
visitTimerSchema.index({ overTime: 1 });

// Virtual for formatted duration
visitTimerSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// Method to add an interruption
visitTimerSchema.methods.addInterruption = function(interruption) {
  this.interruptions.push(interruption);
  return this.save();
};

// Method to calculate total interruption time
visitTimerSchema.methods.getTotalInterruptionTime = function() {
  return this.interruptions.reduce((total, interruption) => {
    return total + (interruption.endTime - interruption.startTime) / 1000;
  }, 0);
};

// Method to calculate actual visit time (excluding interruptions)
visitTimerSchema.methods.getActualVisitTime = function() {
  return this.duration - this.getTotalInterruptionTime();
};

// Method to calculate efficiency score
visitTimerSchema.methods.calculateEfficiency = function() {
  const actualTime = this.getActualVisitTime();
  const recommendedTime = this.recommendedDuration * 60;
  
  // Base efficiency starts at 100
  let efficiency = 100;

  // Deduct points for overtime
  if (actualTime > recommendedTime) {
    const overtimePercentage = (actualTime - recommendedTime) / recommendedTime;
    efficiency -= Math.min(30, overtimePercentage * 100);
  }

  // Deduct points for interruptions
  const interruptionTime = this.getTotalInterruptionTime();
  if (interruptionTime > 0) {
    const interruptionPercentage = interruptionTime / this.duration;
    efficiency -= Math.min(20, interruptionPercentage * 100);
  }

  // Ensure efficiency is between 0 and 100
  this.metrics.efficiency = Math.max(0, Math.min(100, Math.round(efficiency)));
  return this.save();
};

// Pre-save middleware to calculate efficiency
visitTimerSchema.pre('save', async function(next) {
  if (this.isModified('duration') || this.isModified('interruptions')) {
    await this.calculateEfficiency();
  }
  if (this.isNew || this.isModified('appointmentType')) {
    try {
      // Get AI prediction for visit duration
      const prediction = await visitPrediction.predictVisitDuration(
        {
          type: this.appointmentType,
          scheduledTime: this.scheduledStartTime,
          complexity: this.complexity,
          notes: this.notes
        },
        this.patientId
      );

      // Update the document with AI predictions
      this.aiPrediction = {
        duration: prediction.predictedDuration,
        confidence: prediction.confidence,
        factors: prediction.factors,
        considerations: prediction.considerations
      };

      // Set the predicted duration
      this.predictedDuration = prediction.predictedDuration;
    } catch (error) {
      console.error('Error getting AI prediction:', error);
      // Don't block save if AI prediction fails
      next();
    }
  }
  next();
});

// Static method to suggest available slots
visitTimerSchema.statics.suggestSlots = async function(appointmentData, patientId) {
  try {
    // Get all scheduled visits for the next week
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const scheduledVisits = await this.find({
      scheduledStartTime: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' }
    }).select('scheduledStartTime predictedDuration providerId');

    // Generate available slots
    const availableSlots = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Add slots for each provider's working hours
      // This is a simplified version - you'd want to get actual provider schedules
      for (let hour = 9; hour < 17; hour++) {
        availableSlots.push({
          start: new Date(currentDate.setHours(hour, 0, 0, 0)),
          end: new Date(currentDate.setHours(hour + 1, 0, 0, 0)),
          day: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          provider: appointmentData.preferredProvider || 'any'
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Filter out slots that conflict with scheduled visits
    const filteredSlots = availableSlots.filter(slot => {
      return !scheduledVisits.some(visit => {
        const visitEnd = new Date(visit.scheduledStartTime);
        visitEnd.setMinutes(visitEnd.getMinutes() + visit.predictedDuration);
        return slot.start < visitEnd && visit.scheduledStartTime < slot.end;
      });
    });

    // Get AI suggestions for optimal slots
    const suggestions = await visitPrediction.suggestSchedulingSlots(
      appointmentData,
      patientId,
      filteredSlots
    );

    return suggestions;
  } catch (error) {
    console.error('Error suggesting slots:', error);
    throw error;
  }
};

// Method to calculate visit duration and update stats
visitTimerSchema.methods.endVisit = async function() {
  if (this.actualStartTime && !this.actualEndTime) {
    this.actualEndTime = new Date();
    this.status = 'completed';

    // Calculate actual duration in minutes
    const actualDuration = Math.round(
      (this.actualEndTime - this.actualStartTime) / (1000 * 60)
    );

    // Compare with AI prediction for future learning
    if (this.aiPrediction?.duration) {
      const predictionError = Math.abs(actualDuration - this.aiPrediction.duration);
      const predictionAccuracy = Math.max(0, 100 - (predictionError / this.aiPrediction.duration * 100));

      // Log prediction accuracy for analysis
      console.log('Visit prediction accuracy:', {
        visitId: this._id,
        patientId: this.patientId,
        predictedDuration: this.aiPrediction.duration,
        actualDuration,
        accuracy: predictionAccuracy,
        factors: this.aiPrediction.factors
      });
    }

    await this.save();
  }
};

const VisitTimer = mongoose.model('VisitTimer', visitTimerSchema);

module.exports = VisitTimer; 