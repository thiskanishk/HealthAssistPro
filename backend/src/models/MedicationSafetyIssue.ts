import mongoose, { Document, Schema } from 'mongoose';
import { SafetyIssueType, IssueSeverity, IssueStatus } from '../services/MedicationSafetyMonitor';

export interface IMedicationSafetyIssue extends Document {
  patientId: mongoose.Types.ObjectId;
  providerId?: mongoose.Types.ObjectId;
  medications: string[];
  issueType: SafetyIssueType;
  severity: IssueSeverity;
  description: string;
  symptoms: string[];
  reportDate: Date;
  status: IssueStatus;
  resolution?: string;
  resolvedDate?: Date;
  relatedPrescriptionIds?: string[];
}

const medicationSafetyIssueSchema = new Schema({
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  providerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  medications: {
    type: [String],
    required: true,
    index: true
  },
  issueType: {
    type: String,
    enum: Object.values(SafetyIssueType),
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: Object.values(IssueSeverity),
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  symptoms: {
    type: [String],
    required: true,
    index: true
  },
  reportDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(IssueStatus),
    required: true,
    default: IssueStatus.REPORTED,
    index: true
  },
  resolution: String,
  resolvedDate: Date,
  relatedPrescriptionIds: {
    type: [String],
    index: true
  }
}, {
  timestamps: true
});

// Add text search capabilities
medicationSafetyIssueSchema.index({
  description: 'text',
  symptoms: 'text',
  medications: 'text'
});

// Create automatic date for resolution
medicationSafetyIssueSchema.pre('save', function(this: IMedicationSafetyIssue, next) {
  if (this.status === IssueStatus.RESOLVED && !this.resolvedDate) {
    this.resolvedDate = new Date();
  }
  next();
});

// Statistical indexes
medicationSafetyIssueSchema.index({ 
  issueType: 1, 
  reportDate: 1 
});

medicationSafetyIssueSchema.index({ 
  medications: 1, 
  severity: 1,
  status: 1 
});

export const MedicationSafetyIssue = mongoose.model<IMedicationSafetyIssue>('MedicationSafetyIssue', medicationSafetyIssueSchema); 