const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const deviceSchema = new mongoose.Schema({
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

const securityEventSchema = new mongoose.Schema({
  type: String,
  timestamp: Date,
  deviceId: String,
  ipAddress: String,
  success: Boolean,
  details: mongoose.Schema.Types.Mixed
});

const userSchema = new mongoose.Schema({
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
    minlength: 8
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
    enum: ['doctor', 'nurse', 'admin'],
    required: true
  },
  specialization: {
    type: String,
    required: function() {
      return this.role === 'doctor';
    }
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
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
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  activeSessions: [{
    token: String,
    deviceId: String,
    createdAt: Date,
    expiresAt: Date
  }]
}, {
  timestamps: true
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    this.passwordHistory.push({
      password: this.password,
      changedAt: new Date()
    });
    
    if (this.passwordHistory.length > 5) {
      this.passwordHistory = this.passwordHistory.slice(-5);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate verification token
userSchema.methods.generateVerificationToken = function() {
  this.verificationToken = crypto.randomBytes(32).toString('hex');
  return this.verificationToken;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  return this.resetPasswordToken;
};

// Check if password was used before
userSchema.methods.isPasswordReused = async function(candidatePassword) {
  for (const historical of this.passwordHistory) {
    if (await bcrypt.compare(candidatePassword, historical.password)) {
      return true;
    }
  }
  return false;
};

// Generate auth token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      twoFactorEnabled: this.twoFactorEnabled
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn
    }
  );
};

// Add security event
userSchema.methods.addSecurityEvent = function(event) {
  this.securityEvents.push({
    ...event,
    timestamp: new Date()
  });
  
  if (this.securityEvents.length > 100) {
    this.securityEvents = this.securityEvents.slice(-100);
  }
  
  return this.save();
};

// Track login attempt
userSchema.methods.trackLoginAttempt = async function(success, deviceId, ipAddress) {
  if (success) {
    this.failedLoginAttempts = 0;
    this.lastSuccessfulLogin = new Date();
    this.lastActivity = new Date();
  } else {
    this.failedLoginAttempts += 1;
    this.lastFailedLogin = new Date();
    
    if (this.failedLoginAttempts >= 5) {
      this.isLocked = true;
      this.lockReason = 'Too many failed login attempts';
    }
  }
  
  await this.addSecurityEvent({
    type: success ? 'login_success' : 'login_failure',
    deviceId,
    ipAddress,
    success,
    details: {
      failedAttempts: this.failedLoginAttempts
    }
  });
  
  return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User; 