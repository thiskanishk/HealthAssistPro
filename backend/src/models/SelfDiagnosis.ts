import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './User';

interface IVitals {
    temperature?: number;
    bloodPressure?: {
        systolic: number;
        diastolic: number;
    };
    heartRate?: number;
    oxygenSaturation?: number;
}

interface IDiagnosisCondition {
    name: string;
    confidence: number;
    description: string;
    treatments: string[];
}

interface IAIDiagnosis {
    conditions: IDiagnosisCondition[];
    rawResponse: string;
}

interface IFeedback {
    rating?: number;
    comment?: string;
}

export interface ISelfDiagnosis extends Document {
    userId: Schema.Types.ObjectId | IUser;
    symptoms: string[];
    vitals: IVitals;
    aiDiagnosis: IAIDiagnosis;
    feedback: IFeedback;
    createdAt: Date;
    updatedAt: Date;
}

const selfDiagnosisSchema = new Schema<ISelfDiagnosis>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    symptoms: [{
        type: String,
        required: true
    }],
    vitals: {
        temperature: Number,
        bloodPressure: {
            systolic: Number,
            diastolic: Number
        },
        heartRate: Number,
        oxygenSaturation: Number
    },
    aiDiagnosis: {
        conditions: [{
            name: String,
            confidence: Number,
            description: String,
            treatments: [String]
        }],
        rawResponse: String
    },
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String
    }
}, {
    timestamps: true
});

// Add validation for blood pressure values
selfDiagnosisSchema.path('vitals.bloodPressure.systolic').validate(function(value: number) {
    return !value || (value >= 70 && value <= 200);
}, 'Systolic blood pressure must be between 70 and 200');

selfDiagnosisSchema.path('vitals.bloodPressure.diastolic').validate(function(value: number) {
    return !value || (value >= 40 && value <= 130);
}, 'Diastolic blood pressure must be between 40 and 130');

// Add validation for temperature
selfDiagnosisSchema.path('vitals.temperature').validate(function(value: number) {
    return !value || (value >= 35 && value <= 42);
}, 'Temperature must be between 35°C and 42°C');

// Add validation for heart rate
selfDiagnosisSchema.path('vitals.heartRate').validate(function(value: number) {
    return !value || (value >= 30 && value <= 220);
}, 'Heart rate must be between 30 and 220 bpm');

// Add validation for oxygen saturation
selfDiagnosisSchema.path('vitals.oxygenSaturation').validate(function(value: number) {
    return !value || (value >= 70 && value <= 100);
}, 'Oxygen saturation must be between 70% and 100%');

export const SelfDiagnosis: Model<ISelfDiagnosis> = mongoose.model<ISelfDiagnosis>('SelfDiagnosis', selfDiagnosisSchema);

export default SelfDiagnosis; 