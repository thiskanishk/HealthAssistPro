import mongoose, { Document, Schema, Model, Query, Aggregate } from 'mongoose';
import { DosageRange, TherapeuticRange } from '../utils/medicationAnalyzer';

export interface IMedication extends Document {
  name: string;
  genericName: string;
  description: string;
  drugClass: string[];
  dosageForm: string;
  strength: string;
  route: string; // oral, topical, injection, etc.
  contraindications: string[];
  sideEffects: string[];
  interactsWith: string[]; // medication IDs that this interacts with
  pregnancyCategory: 'A' | 'B' | 'C' | 'D' | 'X' | 'N/A';
  pediatricUse: boolean;
  geriatricUse: boolean;
  requiresPrescription: boolean;
  manufacturer: string;
  ndc: string; // National Drug Code
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // New fields for medication analysis
  standardDosages: DosageRange[];
  therapeuticLevels: TherapeuticRange[];
  halfLife?: number; // in hours
  blackBoxWarning?: string;
  geriatricPrecautions?: string[];
  renalAdjustment?: boolean;
  hepaticAdjustment?: boolean;
  genderSpecificRisks?: {
    male?: string[];
    female?: string[];
  };
}

interface IMedicationMethods {
  doesInteractWith(medicationId: string): boolean;
}

interface MedicationModel extends Model<IMedication, {}, IMedicationMethods> {
  findByDrugClass(drugClass: string): Query<IMedication[], IMedication>;
  findAllActive(): Query<IMedication[], IMedication>;
  findInteractions(medicationId: string): Query<IMedication[], IMedication>;
  findByClass(drugClass: string): Query<IMedication[], IMedication>;
  searchByText(searchText: string): Query<IMedication[], IMedication>;
  findAlternatives(medicationId: string): Aggregate<Array<IMedication>>;
}

const MedicationSchema = new Schema<IMedication, MedicationModel, IMedicationMethods>(
  {
    name: {
      type: String,
      required: [true, 'Medication name is required'],
      trim: true,
      index: true
    },
    genericName: {
      type: String,
      required: [true, 'Generic name is required'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    drugClass: {
      type: [String],
      required: [true, 'Drug class is required'],
      index: true
    },
    dosageForm: {
      type: String,
      required: [true, 'Dosage form is required'],
      enum: [
        'tablet', 'capsule', 'liquid', 'injection', 'topical', 
        'inhaler', 'patch', 'suppository', 'drops', 'other'
      ]
    },
    strength: {
      type: String,
      required: [true, 'Strength is required']
    },
    route: {
      type: String,
      required: [true, 'Route of administration is required'],
      enum: [
        'oral', 'topical', 'intravenous', 'intramuscular', 'subcutaneous',
        'inhaled', 'ophthalmic', 'otic', 'nasal', 'rectal', 'vaginal', 'other'
      ]
    },
    contraindications: {
      type: [String],
      default: []
    },
    sideEffects: {
      type: [String],
      default: []
    },
    interactsWith: {
      type: [String],
      default: []
    },
    pregnancyCategory: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'X', 'N/A'],
      default: 'N/A'
    },
    pediatricUse: {
      type: Boolean,
      default: true
    },
    geriatricUse: {
      type: Boolean,
      default: true
    },
    requiresPrescription: {
      type: Boolean,
      default: true
    },
    manufacturer: {
      type: String,
      required: [true, 'Manufacturer is required']
    },
    ndc: {
      type: String,
      required: [true, 'NDC code is required'],
      unique: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // New fields for medication analysis
    standardDosages: [
      {
        min: Number,
        max: Number,
        unit: String,
        frequency: String,
        route: String,
        ageGroup: {
          type: String,
          enum: ['adult', 'pediatric', 'geriatric']
        },
        weightBased: Boolean,
        condition: String
      }
    ],
    therapeuticLevels: [
      {
        min: Number,
        max: Number,
        unit: String,
        timing: {
          type: String,
          enum: ['peak', 'trough', 'steady-state']
        },
        condition: String
      }
    ],
    halfLife: Number, // in hours
    blackBoxWarning: String,
    geriatricPrecautions: [String],
    renalAdjustment: Boolean,
    hepaticAdjustment: Boolean,
    genderSpecificRisks: {
      male: [String],
      female: [String]
    }
  },
  {
    timestamps: true
  }
);

// Indexes for faster queries
MedicationSchema.index({ name: 'text', genericName: 'text', drugClass: 'text' });
MedicationSchema.index({ isActive: 1 });
MedicationSchema.index({ requiresPrescription: 1 });

// Virtual for computing if medication is over-the-counter
MedicationSchema.virtual('isOTC').get(function(this: IMedication) {
  return !this.requiresPrescription;
});

// Method to check if this medication interacts with another
MedicationSchema.methods.doesInteractWith = function(this: IMedication, medicationId: string): boolean {
  return this.interactsWith.some((id) => id.toString() === medicationId);
};

// Static method to find medications by drug class
MedicationSchema.statics.findByDrugClass = function(
  drugClass: string
): Query<IMedication[], IMedication> {
  return this.find({ 
    drugClass: { $regex: new RegExp(drugClass, 'i') },
    isActive: true 
  });
};

// Alias for findByDrugClass to maintain compatibility
MedicationSchema.statics.findByClass = function(
  drugClass: string
): Query<IMedication[], IMedication> {
  return this.findByDrugClass(drugClass);
};

// Static method to find all active medications
MedicationSchema.statics.findAllActive = function(): Query<IMedication[], IMedication> {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to find all medications that interact with a given medication
MedicationSchema.statics.findInteractions = function(
  medicationId: string
): Query<IMedication[], IMedication> {
  // Find medications that list this medication in their interactsWith array
  // OR that are listed in this medication's interactsWith array
  return this.find({
    $or: [
      { interactsWith: medicationId },
      { _id: { $in: this.findById(medicationId).select('interactsWith') } }
    ],
    isActive: true
  });
};

// Text search for medications
MedicationSchema.statics.searchByText = function(
  searchText: string
): Query<IMedication[], IMedication> {
  return this.find(
    { 
      $text: { $search: searchText },
      isActive: true
    },
    { 
      score: { $meta: 'textScore' } 
    }
  ).sort({ score: { $meta: 'textScore' } });
};

// Find alternative medications (same drug class)
MedicationSchema.statics.findAlternatives = function(
  medicationId: string
): Aggregate<Array<IMedication>> {
  // This will create a query that finds a medication by ID first,
  // then uses that medication's drug class to find alternatives
  return this.aggregate([
    // First stage: Find the original medication
    { $match: { _id: new mongoose.Types.ObjectId(medicationId) } },
    
    // Second stage: Lookup medications with the same drug class
    { 
      $lookup: {
        from: 'medications',
        let: { drugClasses: '$drugClass' },
        pipeline: [
          { 
            $match: {
              $expr: {
                $and: [
                  { $ne: ['$_id', new mongoose.Types.ObjectId(medicationId)] },
                  { $gt: [{ $size: { $setIntersection: ['$drugClass', '$$drugClasses'] } }, 0] },
                  { $eq: ['$isActive', true] }
                ]
              }
            }
          }
        ],
        as: 'alternatives'
      }
    },
    
    // Third stage: Unwind the alternatives array
    { $unwind: '$alternatives' },
    
    // Fourth stage: Replace the root with each alternative
    { $replaceRoot: { newRoot: '$alternatives' } }
  ]);
};

const Medication = mongoose.model<IMedication, MedicationModel>('Medication', MedicationSchema);

export default Medication; 