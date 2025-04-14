import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './User';

export interface IRefreshToken extends Document {
    userId: Schema.Types.ObjectId | IUser;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Add index for efficient querying
RefreshTokenSchema.index({ userId: 1, expiresAt: 1 });

// Add method to check if token is expired
RefreshTokenSchema.methods.isExpired = function(): boolean {
    return Date.now() >= this.expiresAt.getTime();
};

// Static method to clean up expired tokens
RefreshTokenSchema.statics.removeExpired = async function(): Promise<{ deletedCount: number }> {
    return this.deleteMany({
        expiresAt: { $lt: new Date() }
    });
};

// Static method to find valid token
RefreshTokenSchema.statics.findValidToken = async function(token: string): Promise<IRefreshToken | null> {
    return this.findOne({
        token,
        expiresAt: { $gt: new Date() }
    }).populate('userId');
};

export const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);

export default RefreshToken; 