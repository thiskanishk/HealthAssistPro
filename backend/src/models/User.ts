import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '../types/auth';

export interface IUser extends Document {
    email: string;
    password: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    specialization?: string;
    licenseNumber?: string;
    phoneNumber?: string;
    lastLogin?: Date;
    isActive: boolean;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false
    },
    role: {
        type: String,
        enum: ['doctor', 'nurse', 'admin', 'patient'],
        required: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    specialization: {
        type: String,
        required: function() {
            return this.role === 'doctor';
        }
    },
    licenseNumber: {
        type: String,
        required: function() {
            return ['doctor', 'nurse'].includes(this.role);
        },
        unique: true,
        sparse: true
    },
    phoneNumber: String,
    lastLogin: Date,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error as Error);
    }
});

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema); 