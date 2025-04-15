import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMedicationRecommendation {
  medicationName: string;
  drugClass: string;
  strengthOfRecommendation: 'STRONG' | 'MODERATE' | 'WEAK';
  qualityOfEvidence: 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
  dosageRecommendation: string;
  firstLine: boolean;
  alternativeTo?: string[];
  comments?: string;
}

export interface ITreatmentGuideline extends Document {
  conditionName: string;
  conditionDescription: string;
  icdCodes: string[];
  recommendedMedications: IMedicationRecommendation[];
  nonPharmacologicalInterventions: string[];
  assessmentTools: string[];
  followUpRecommendations: string[];
  specialPopulations: {
    pediatric?: string;
    geriatric?: string;
    pregnant?: string;
    renalImpairment?: string;
    hepaticImpairment?: string;
  };
  referralCriteria: string[];
  sourceGuidelines: {
    organization: string;
    title: string;
    publicationYear: number;
    url?: string;
  }[];
  lastReviewed: Date;
  nextReviewDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MedicationRecommendationSchema = new Schema<IMedicationRecommendation>({
  medicationName: {
    type: String,
    required: true,
    trim: true,
  },
  drugClass: {
    type: String,
    required: true,
    trim: true,
  },
  strengthOfRecommendation: {
    type: String,
    enum: ['STRONG', 'MODERATE', 'WEAK'],
    required: true,
  },
  qualityOfEvidence: {
    type: String,
    enum: ['HIGH', 'MODERATE', 'LOW', 'VERY_LOW'],
    required: true,
  },
  dosageRecommendation: {
    type: String,
    required: true,
  },
  firstLine: {
    type: Boolean,
    default: false,
  },
  alternativeTo: {
    type: [String],
  },
  comments: String,
});

const TreatmentGuidelineSchema = new Schema<ITreatmentGuideline>(
  {
    conditionName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    conditionDescription: {
      type: String,
      required: true,
    },
    icdCodes: {
      type: [String],
      index: true,
    },
    recommendedMedications: {
      type: [MedicationRecommendationSchema],
      default: [],
    },
    nonPharmacologicalInterventions: {
      type: [String],
      default: [],
    },
    assessmentTools: {
      type: [String],
      default: [],
    },
    followUpRecommendations: {
      type: [String],
      default: [],
    },
    specialPopulations: {
      pediatric: String,
      geriatric: String,
      pregnant: String,
      renalImpairment: String,
      hepaticImpairment: String,
    },
    referralCriteria: {
      type: [String],
      default: [],
    },
    sourceGuidelines: [
      {
        organization: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        publicationYear: {
          type: Number,
          required: true,
        },
        url: String,
      },
    ],
    lastReviewed: {
      type: Date,
      default: Date.now,
    },
    nextReviewDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Text search indices
TreatmentGuidelineSchema.index({ 
  conditionName: 'text', 
  conditionDescription: 'text', 
  icdCodes: 'text',
  'recommendedMedications.medicationName': 'text',
  'recommendedMedications.drugClass': 'text'
});

// Compound indices for common queries
TreatmentGuidelineSchema.index({ 'recommendedMedications.medicationName': 1 });
TreatmentGuidelineSchema.index({ 'recommendedMedications.drugClass': 1 });
TreatmentGuidelineSchema.index({ icdCodes: 1 });

export const TreatmentGuideline: Model<ITreatmentGuideline> = mongoose.model<ITreatmentGuideline>(
  'TreatmentGuideline',
  TreatmentGuidelineSchema
); 