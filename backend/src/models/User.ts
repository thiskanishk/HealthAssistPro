import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRole } from '../types/auth';

export type UserStatus = 'active' | 'inactive' | 'suspended';

interface IDevice {
    deviceId: string;
    name: string;
    type: string;
    browser: {
        name: string;
        version: string;
    };
    os: {
        name: string;
        version: string;
    };
    ipAddress: string;
    location: {
        country: string;
        region: string;
        city: string;
        timezone: string;
    };
    trusted: boolean;
    trustExpires?: Date;
    firstSeen: Date;
    lastUsed: Date;
}

interface ISecurityEvent {
    type: string;
    timestamp: Date;
    deviceId: string;
    ipAddress: string;
    success: boolean;
    details: any;
}

interface IPasswordHistory {
    password: string;
    changedAt: Date;
}

interface IBackupCode {
    code: string;
    used: boolean;
}

interface IActiveSession {
    token: string;
    deviceId: string;
    createdAt: Date;
    expiresAt: Date;
}

export interface IUser extends Document {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    specialization?: string;
    licenseNumber?: string;
    isEmailVerified: boolean;
    verificationToken?: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    lastLogin?: Date;
    status: UserStatus;
    isActive: boolean;
    isLocked: boolean;
    lockReason?: string;
    failedLoginAttempts: number;
    lastFailedLogin?: Date;
    lastSuccessfulLogin?: Date;
    lastActivity?: Date;
    requirePasswordReset: boolean;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    passwordHistory: IPasswordHistory[];
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    backupCodes: IBackupCode[];
    devices: IDevice[];
    securityEvents: ISecurityEvent[];
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    activeSessions: IActiveSession[];
    dateOfBirth?: Date;
    medicalHistory: string[];
    emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
    };
    comparePassword(candidatePassword: string): Promise<boolean>;
    generateVerificationToken(): string;
    generatePasswordResetToken(): string;
    isPasswordReused(candidatePassword: string): Promise<boolean>;
    generateAuthToken(): string;
    addSecurityEvent(event: Omit<ISecurityEvent, 'timestamp'>): Promise<void>;
    trackLoginAttempt(success: boolean, deviceId: string, ipAddress: string): Promise<void>;
}

const deviceSchema = new Schema<IDevice>({
    deviceId: String,
    name: String,
    type: String,
    browser: {
        name: String,
        version: String
    },
    os: {
        name: String,
        version: String
    },
    ipAddress: String,
    location: {
        country: String,
        region: String,
        city: String,
        timezone: String
    },
    trusted: {
        type: Boolean,
        default: false
    },
    trustExpires: Date,
    firstSeen: Date,
    lastUsed: Date
});

const securityEventSchema = new Schema<ISecurityEvent>({
    type: String,
    timestamp: Date,
    deviceId: String,
    ipAddress: String,
    success: Boolean,
    details: Schema.Types.Mixed
});

// Hardcoded defaults - MOVE THESE TO config/index.ts!
const BCRYPT_SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_DEFAULT_JWT_SECRET'; // Ensure JWT_SECRET is set in env or config
const JWT_EXPIRES_IN = '1h';
const TOKEN_EXPIRATION_VERIFICATION = 3600000; // 1 hour
const TOKEN_EXPIRATION_PASSWORD_RESET = 3600000; // 1 hour
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_EVENT_HISTORY = 100;

const userSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false
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
    role: {
        type: String,
        enum: ['doctor', 'nurse', 'admin', 'patient'],
        required: true
    },
    specialization: {
        type: String,
        required: function(this: IUser) {
            return this.role === 'doctor';
        }
    },
    licenseNumber: {
        type: String,
        required: function(this: IUser) {
            return ['doctor', 'nurse'].includes(this.role);
        },
        unique: true,
        sparse: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLogin: Date,
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'inactive'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    lockReason: String,
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    lastFailedLogin: Date,
    lastSuccessfulLogin: Date,
    lastActivity: Date,
    requirePasswordReset: {
        type: Boolean,
        default: false
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordHistory: [{
        password: String,
        changedAt: Date
    }],
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: String,
    backupCodes: [{
        code: String,
        used: {
            type: Boolean,
            default: false
        }
    }],
    devices: [deviceSchema],
    securityEvents: [securityEventSchema],
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    activeSessions: [{
        token: String,
        deviceId: String,
        createdAt: Date,
        expiresAt: Date
    }],
    dateOfBirth: Date,
    medicalHistory: [String],
    emergencyContact: {
        name: String,
        phone: String,
        relationship: String
    }
}, {
    timestamps: true
});

userSchema.pre<IUser>('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        this.password = await bcrypt.hash(this.password, salt);
        
        this.passwordHistory.unshift({
            password: this.password,
            changedAt: new Date()
        });
        
        if (this.passwordHistory.length > 5) {
            this.passwordHistory.pop();
        }
        
        next();
    } catch (error: any) {
        next(error);
    }
});

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateVerificationToken = function(): string {
    const verificationToken = crypto.randomBytes(20).toString('hex');
    this.emailVerificationToken = verificationToken;
    this.emailVerificationExpires = new Date(Date.now() + TOKEN_EXPIRATION_VERIFICATION);
    return verificationToken;
};

userSchema.methods.generatePasswordResetToken = function(): string {
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    this.resetPasswordExpires = new Date(Date.now() + TOKEN_EXPIRATION_PASSWORD_RESET);
    return resetToken;
};

userSchema.methods.isPasswordReused = async function(candidatePassword: string): Promise<boolean> {
    if (!this.passwordHistory || this.passwordHistory.length === 0) {
        return false;
    }
    for (const record of this.passwordHistory) {
        if (await bcrypt.compare(candidatePassword, record.password)) {
            return true;
        }
    }
    return false;
};

userSchema.methods.generateAuthToken = function(): string {
    if (!JWT_SECRET) {
        console.error('JWT_SECRET is not defined. Cannot generate auth token.');
        throw new Error('JWT configuration error.'); // Or handle more gracefully
    }
    return jwt.sign({ id: this._id, role: this.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

userSchema.methods.addSecurityEvent = async function(event: Omit<ISecurityEvent, 'timestamp'>): Promise<void> {
    const eventWithTimestamp: ISecurityEvent = {
        ...event,
        timestamp: new Date()
    };
    this.securityEvents.push(eventWithTimestamp);
    if (this.securityEvents.length > MAX_EVENT_HISTORY) {
        this.securityEvents.shift();
    }
};

userSchema.methods.trackLoginAttempt = async function(success: boolean, deviceId: string, ipAddress: string): Promise<void> {
    const maxAttempts = MAX_LOGIN_ATTEMPTS;
    const maxEventHistory = MAX_EVENT_HISTORY;

    const securityEvent: Omit<ISecurityEvent, 'timestamp'> = {
        type: success ? 'login_success' : 'login_failure',
        deviceId,
        ipAddress,
        success,
        details: {}
    };

    if (success) {
        this.failedLoginAttempts = 0;
        this.lastSuccessfulLogin = new Date();
        this.isLocked = false;
        this.lockReason = undefined;
        securityEvent.type = 'login_success';
    } else {
        this.failedLoginAttempts += 1;
        this.lastFailedLogin = new Date();
        securityEvent.type = 'login_failure';
        if (this.failedLoginAttempts >= maxAttempts) {
            this.isLocked = true;
            this.lockReason = `Account locked due to ${maxAttempts} failed login attempts.`;
            securityEvent.details = { reason: 'Account locked' };
        }
    }
    
    this.securityEvents.push({ ...securityEvent, timestamp: new Date() });
    if (this.securityEvents.length > maxEventHistory) {
        this.securityEvents.shift();
    }
};

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User; 