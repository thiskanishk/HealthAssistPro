const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');
const encryptionService = require('../services/encryption');

const patientSchema = new mongoose.Schema({
  // Basic Information
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
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  contactInfo: {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },

  // Medical Information
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    status: {
      type: String,
      enum: ['active', 'resolved', 'ongoing'],
      default: 'active'
    },
    notes: String
  }],

  allergies: [{
    allergen: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    reaction: String
  }],

  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['active', 'discontinued', 'completed'],
      default: 'active'
    }
  }],

  vitals: [{
    date: {
      type: Date,
      default: Date.now
    },
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    temperature: Number,
    respiratoryRate: Number,
    oxygenSaturation: Number,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // AI Diagnosis History
  aiDiagnoses: [{
    date: {
      type: Date,
      default: Date.now
    },
    symptoms: [String],
    conditions: [{
      name: String,
      confidence: Number,
      description: String
    }],
    recommendedTests: [String],
    treatmentSuggestions: [String],
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  }],

  // Visit Notes
  notes: [{
    date: {
      type: Date,
      default: Date.now
    },
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['general', 'diagnosis', 'treatment', 'followUp'],
      default: 'general'
    }
  }],

  // Emergency Contact
  emergencyContact: {
    name: String,
    relationship: String,
    phone: {
      iv: String,
      encryptedData: String,
      tag: String
    }
  },

  // Meta Information
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  primaryCareProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastVisit: Date,
  nextAppointment: Date,

  // Add version control
  __v: { type: Number, default: 0 },
  versions: [{
    timestamp: { type: Date, default: Date.now },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changes: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }]
  }],

  // Sensitive information with encryption
  ssn: {
    iv: String,
    encryptedData: String,
    tag: String
  },

  // Track record access
  accessLog: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    action: String,
    ipAddress: String
  }]
}, {
  timestamps: true
});

// Encryption middleware for sensitive data
patientSchema.pre('save', async function(next) {
  if (this.isModified('contactInfo.email') || this.isModified('contactInfo.phone')) {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (this.contactInfo.email) {
      this.contactInfo.email = CryptoJS.AES.encrypt(
        this.contactInfo.email,
        encryptionKey
      ).toString();
    }
    
    if (this.contactInfo.phone) {
      this.contactInfo.phone = CryptoJS.AES.encrypt(
        this.contactInfo.phone,
        encryptionKey
      ).toString();
    }
  }

  if (this.isModified('ssn')) {
    const encrypted = encryptionService.encrypt(this.ssn);
    this.ssn = encrypted;
  }
  
  if (this.isModified('emergencyContact.phone')) {
    const encrypted = encryptionService.encrypt(this.emergencyContact.phone);
    this.emergencyContact.phone = encrypted;
  }
  
  // Increment version and store changes
  if (this.isModified()) {
    this.__v += 1;
    const changes = this.modifiedPaths().map(path => ({
      field: path,
      oldValue: this.get(path),
      newValue: this[path]
    }));
    
    this.versions.push({
      timestamp: new Date(),
      modifiedBy: this._modifiedBy, // Set this when updating
      changes
    });
  }
  
  next();
});

// Decryption methods
patientSchema.methods.getDecryptedEmail = function() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const bytes = CryptoJS.AES.decrypt(this.contactInfo.email, encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

patientSchema.methods.getDecryptedPhone = function() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const bytes = CryptoJS.AES.decrypt(this.contactInfo.phone, encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Method to decrypt sensitive data
patientSchema.methods.decryptSensitiveData = function() {
  const decrypted = { ...this.toObject() };
  
  if (this.ssn) {
    decrypted.ssn = encryptionService.decrypt(this.ssn);
  }
  
  if (this.emergencyContact && this.emergencyContact.phone) {
    decrypted.emergencyContact.phone = encryptionService.decrypt(this.emergencyContact.phone);
  }
  
  return decrypted;
};

// Method to log access
patientSchema.methods.logAccess = async function(userId, action, ipAddress) {
  this.accessLog.push({
    userId,
    action,
    ipAddress,
    timestamp: new Date()
  });
  await this.save();
};

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient; 