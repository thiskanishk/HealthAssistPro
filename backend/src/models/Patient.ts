import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './User';

/**
 * PatientData interface for use in various services
 */
export interface PatientData {
  age: number;
  gender: string;
  symptoms: string[];
  medicalHistory: Array<{
    condition: string;
    diagnosedDate: Date;
    status: 'active' | 'resolved' | 'managed';
    notes?: string;
  }>;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
  }>;
  allergies: string[];
  vitals?: {
    height?: number;
    weight?: number;
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  };
}

export interface IAiDiagnosis {
    date: Date;
    symptoms: string[];
    conditions: Array<{ condition: string; confidence: number }>;
    recommendedTests: string[];
    treatmentSuggestions: string[];
    notes?: string;
    reviewedBy: mongoose.Types.ObjectId;
    status: 'pending' | 'reviewed' | 'confirmed' | 'rejected';
    feedback?: {
        rating: number;
        comments?: string;
        providedBy: mongoose.Types.ObjectId;
    };
}

export interface IPatient extends Document {
    userId: Schema.Types.ObjectId | IUser;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'male' | 'female' | 'other';
    bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    allergies: string[];
    chronicConditions: string[];
    medications: Array<{
        name: string;
        dosage: string;
        frequency: string;
        startDate: Date;
        endDate?: Date;
    }>;
    contactInfo: {
        phone: string;
        email: string;
        address: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
        };
    };
    emergencyContact: {
        name: string;
        relationship: string;
        phone: string;
    };
    insuranceInfo: {
        provider: string;
        policyNumber: string;
        groupNumber: string;
        expiryDate: Date;
    };
    medicalHistory: Array<{
        condition: string;
        diagnosedDate: Date;
        status: 'active' | 'resolved' | 'managed';
        notes: string;
    }>;
    visits: Array<{
        date: Date;
        type: 'regular' | 'emergency' | 'follow-up';
        doctorId: Schema.Types.ObjectId;
        symptoms: string[];
        diagnosis: string;
        prescriptions: string[];
        notes: string;
    }>;
    vitalSigns?: {
        height?: number;
        weight?: number;
        bloodPressure?: string;
        heartRate?: number;
        temperature?: number;
        respiratoryRate?: number;
        oxygenSaturation?: number;
        lastUpdated?: Date;
    };
    aiDiagnoses: IAiDiagnosis[];
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    fullName: string; // Virtual
    getAge(): number;
    getRecentVisits(limit?: number): Array<{
        date: Date;
        type: string;
        doctorId: Schema.Types.ObjectId;
        symptoms: string[];
        diagnosis: string;
        prescriptions: string[];
        notes: string;
    }>;
}

interface IMedication {
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
}

interface IVisit {
    date: Date;
    type: 'regular' | 'emergency' | 'follow-up';
    doctorId: Schema.Types.ObjectId;
    symptoms: string[];
    diagnosis: string;
    prescriptions: string[];
    notes: string;
}

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (international format)
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

const PatientSchema = new Schema<IPatient>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, 'First name must be at least 2 characters long']
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters long']
    },
    dateOfBirth: {
        type: Date,
        required: true,
        validate: {
            validator: function(value: Date) {
                return value <= new Date();
            },
            message: 'Date of birth cannot be in the future'
        }
    },
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female', 'other']
    },
    bloodType: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
        required: true
    },
    allergies: [{
        type: String,
        trim: true
    }],
    chronicConditions: [{
        type: String,
        trim: true
    }],
    medications: [{
        name: {
            type: String,
            required: true
        },
        dosage: {
            type: String,
            required: true
        },
        frequency: {
            type: String,
            required: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: Date
    }],
    contactInfo: {
        phone: {
            type: String,
            required: true,
            validate: {
                validator: function(v: string) {
                    return phoneRegex.test(v);
                },
                message: 'Please enter a valid phone number'
            }
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            validate: {
                validator: function(v: string) {
                    return emailRegex.test(v);
                },
                message: 'Please enter a valid email address'
            }
        },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String
        }
    },
    emergencyContact: {
        name: {
            type: String,
            required: true
        },
        relationship: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true,
            validate: {
                validator: function(v: string) {
                    return phoneRegex.test(v);
                },
                message: 'Please enter a valid phone number'
            }
        }
    },
    insuranceInfo: {
        provider: String,
        policyNumber: String,
        groupNumber: String,
        expiryDate: Date
    },
    medicalHistory: [{
        condition: {
            type: String,
            required: true
        },
        diagnosedDate: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            required: true,
            enum: ['active', 'resolved', 'managed']
        },
        notes: String
    }],
    visits: [{
        date: {
            type: Date,
            required: true
        },
        type: {
            type: String,
            required: true,
            enum: ['regular', 'emergency', 'follow-up']
        },
        doctorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        symptoms: [{
            type: String,
            trim: true
        }],
        diagnosis: String,
        prescriptions: [String],
        notes: String
    }],
    vitalSigns: {
        height: Number, // in cm
        weight: Number, // in kg
        bloodPressure: String, // systolic/diastolic
        heartRate: Number, // bpm
        temperature: Number, // celsius
        respiratoryRate: Number, // breaths per minute
        oxygenSaturation: Number, // percentage
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    aiDiagnoses: [{
        date: {
            type: Date,
            default: Date.now
        },
        symptoms: [{
            type: String,
            required: true
        }],
        conditions: [{
            condition: String,
            confidence: Number
        }],
        recommendedTests: [String],
        treatmentSuggestions: [String],
        notes: String,
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'confirmed', 'rejected'],
            default: 'pending'
        },
        feedback: {
            rating: {
                type: Number,
                min: 1,
                max: 5
            },
            comments: String,
            providedBy: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            }
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Virtual for patient's full name
PatientSchema.virtual('fullName').get(function(this: IPatient) {
    return `${this.firstName} ${this.lastName}`;
});

// Method to get patient's age
PatientSchema.methods.getAge = function(this: IPatient): number {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
};

// Method to get recent visits
PatientSchema.methods.getRecentVisits = function(this: IPatient, limit = 5): IVisit[] {
    return this.visits
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
};

// Create and export the Patient model
export const Patient = mongoose.model<IPatient>('Patient', PatientSchema);

export default Patient; 