import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './User';

export type AuditAction = 
    | 'user_login'
    | 'user_logout'
    | 'user_created'
    | 'user_updated'
    | 'patient_created'
    | 'patient_updated'
    | 'diagnosis_created'
    | 'prescription_created'
    | 'appointment_scheduled'
    | 'appointment_cancelled'
    | 'medical_record_accessed'
    | 'medical_record_updated';

export interface IAuditLog extends Document {
    userId: Schema.Types.ObjectId | IUser;
    action: AuditAction;
    metadata: Record<string, any>;
    timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'user_login',
            'user_logout',
            'user_created',
            'user_updated',
            'patient_created',
            'patient_updated',
            'diagnosis_created',
            'prescription_created',
            'appointment_scheduled',
            'appointment_cancelled',
            'medical_record_accessed',
            'medical_record_updated'
        ]
    },
    metadata: {
        type: Schema.Types.Mixed,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false // We're using our own timestamp field
});

// Index for efficient querying
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

// Add validation to ensure metadata is an object
AuditLogSchema.path('metadata').validate(function(value: any) {
    return value && typeof value === 'object' && !Array.isArray(value);
}, 'Metadata must be an object');

// Static method to create an audit log entry
AuditLogSchema.statics.createLog = async function(
    userId: string,
    action: AuditAction,
    metadata: Record<string, any>
): Promise<IAuditLog> {
    return this.create({
        userId,
        action,
        metadata,
        timestamp: new Date()
    });
};

// Method to add additional metadata
AuditLogSchema.methods.addMetadata = async function(
    additionalMetadata: Record<string, any>
): Promise<IAuditLog> {
    this.metadata = {
        ...this.metadata,
        ...additionalMetadata,
        updatedAt: new Date()
    };
    return this.save();
};

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog; 