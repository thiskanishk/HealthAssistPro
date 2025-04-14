import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './User';

interface IVitalSigns {
  temperature?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
}

interface ILabTest {
  name: string;
  results: string;
  normalRange?: string;
  isAbnormal: boolean;
  performedAt: Date;
}

interface IMedicalCondition {
  name: string;
  confidence: number;
  icd10Code?: string;
  description: string;
  differentialDiagnoses?: string[];
  recommendedTests?: string[];
  recommendedTreatments: string[];
  followUpRecommendations?: string[];
  riskFactors?: string[];
}

interface IClinicianFeedback {
  clinicianId: Schema.Types.ObjectId | IUser;
  comments: string;
  agreementLevel: 'full' | 'partial' | 'none';
  suggestedAlternatives?: string[];
  createdAt: Date;
}

export interface IDiagnosis extends Document {
  patientId: Schema.Types.ObjectId | IUser;
  clinicianId?: Schema.Types.ObjectId | IUser;
  chiefComplaint: string;
  symptoms: string[];
  vitalSigns: IVitalSigns;
  labTests?: ILabTest[];
  medicalConditions: IMedicalCondition[];
  treatmentPlan?: string;
  medications?: string[];
  notes?: string;
  aiGenerated: boolean;
  aiConfidenceScore?: number;
  clinicianFeedback?: IClinicianFeedback;
  status: 'preliminary' | 'confirmed' | 'ruled-out';
  createdAt: Date;
  updatedAt: Date;
}

const diagnosisSchema = new Schema<IDiagnosis>({
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clinicianId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  chiefComplaint: {
    type: String,
    required: true
  },
  symptoms: [{
    type: String,
    required: true
  }],
  vitalSigns: {
    temperature: Number,
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    respiratoryRate: Number,
    oxygenSaturation: Number,
    weight: Number,
    height: Number,
    bmi: Number
  },
  labTests: [{
    name: String,
    results: String,
    normalRange: String,
    isAbnormal: Boolean,
    performedAt: Date
  }],
  medicalConditions: [{
    name: {
      type: String,
      required: true
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    icd10Code: String,
    description: String,
    differentialDiagnoses: [String],
    recommendedTests: [String],
    recommendedTreatments: [String],
    followUpRecommendations: [String],
    riskFactors: [String]
  }],
  treatmentPlan: String,
  medications: [String],
  notes: String,
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiConfidenceScore: {
    type: Number,
    min: 0,
    max: 100
  },
  clinicianFeedback: {
    clinicianId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    comments: String,
    agreementLevel: {
      type: String,
      enum: ['full', 'partial', 'none']
    },
    suggestedAlternatives: [String],
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    enum: ['preliminary', 'confirmed', 'ruled-out'],
    default: 'preliminary'
  }
}, {
  timestamps: true
});

// Add validation for vital signs
diagnosisSchema.path('vitalSigns.bloodPressure.systolic').validate(function(value: number) {
  return !value || (value >= 70 && value <= 220);
}, 'Systolic blood pressure must be between 70 and 220 mmHg');

diagnosisSchema.path('vitalSigns.bloodPressure.diastolic').validate(function(value: number) {
  return !value || (value >= 40 && value <= 130);
}, 'Diastolic blood pressure must be between 40 and 130 mmHg');

diagnosisSchema.path('vitalSigns.temperature').validate(function(value: number) {
  return !value || (value >= 35 && value <= 42);
}, 'Temperature must be between 35°C and 42°C');

diagnosisSchema.path('vitalSigns.heartRate').validate(function(value: number) {
  return !value || (value >= 30 && value <= 220);
}, 'Heart rate must be between 30 and 220 bpm');

diagnosisSchema.path('vitalSigns.oxygenSaturation').validate(function(value: number) {
  return !value || (value >= 70 && value <= 100);
}, 'Oxygen saturation must be between 70% and 100%');

diagnosisSchema.path('vitalSigns.respiratoryRate').validate(function(value: number) {
  return !value || (value >= 8 && value <= 40);
}, 'Respiratory rate must be between 8 and 40 breaths per minute');

// Add index for efficient queries
diagnosisSchema.index({ patientId: 1, createdAt: -1 });
diagnosisSchema.index({ clinicianId: 1 });

export const DiagnosisModel: Model<IDiagnosis> = mongoose.model<IDiagnosis>('Diagnosis', diagnosisSchema);

export default DiagnosisModel; 