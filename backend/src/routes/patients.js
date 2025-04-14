const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Patient = require('../models/Patient');
const { verifyToken, authorize, logActivity } = require('../middleware/auth');
const { requestSizeLimiter, auditLog } = require('../middleware/security');

// Apply security middleware to all routes
router.use(requestSizeLimiter);
router.use(auditLog);

// Validation middleware
const validatePatient = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
  body('contactInfo.email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('contactInfo.phone').notEmpty().withMessage('Phone number is required'),
  body('contactInfo.address').optional().isObject(),
  body('emergencyContact').optional().isObject()
];

const validateVitals = [
  body('bloodPressure.systolic').isInt({ min: 60, max: 250 }),
  body('bloodPressure.diastolic').isInt({ min: 40, max: 150 }),
  body('heartRate').isInt({ min: 30, max: 250 }),
  body('temperature').isFloat({ min: 35, max: 43 }),
  body('respiratoryRate').isInt({ min: 8, max: 40 }),
  body('oxygenSaturation').isInt({ min: 60, max: 100 })
];

// Create new patient
router.post(
  '/',
  verifyToken,
  authorize('doctor'),
  validatePatient,
  logActivity('patient_create'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const patient = new Patient({
        ...req.body,
        _modifiedBy: req.user.id
      });

      await patient.save();
      await patient.logAccess(req.user.id, 'create', req.ip);

      res.status(201).json({
        status: 'success',
        data: patient
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get all patients (with pagination and filters)
router.get(
  '/',
  verifyToken,
  authorize('doctor', 'nurse', 'admin'),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        filter.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex }
        ];
      }

      // If nurse, only show assigned patients
      if (req.user.role === 'nurse') {
        filter.status = 'active';
      }

      const patients = await Patient.find(filter)
        .populate('primaryCareProvider', 'firstName lastName')
        .skip(skip)
        .limit(limit)
        .sort({ lastName: 1, firstName: 1 });

      const total = await Patient.countDocuments(filter);

      res.json({
        status: 'success',
        data: {
          patients,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get patient by ID
router.get(
  '/:id',
  verifyToken,
  authorize('doctor', 'nurse'),
  async (req, res) => {
    try {
      const patient = await Patient.findById(req.params.id);
      
      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found'
        });
      }

      // Log access
      await patient.logAccess(req.user.id, 'view', req.ip);

      // Decrypt sensitive data if authorized
      const patientData = req.user.role === 'doctor' 
        ? patient.decryptSensitiveData()
        : patient.toObject();

      res.json({
        status: 'success',
        data: patientData
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Update patient
router.put(
  '/:id',
  verifyToken,
  authorize('doctor'),
  validatePatient,
  logActivity('patient_update'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const patient = await Patient.findById(req.params.id);
      
      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found'
        });
      }

      // Set modifier for versioning
      patient._modifiedBy = req.user.id;

      // Update fields
      Object.keys(req.body).forEach(key => {
        patient[key] = req.body[key];
      });

      await patient.save();
      await patient.logAccess(req.user.id, 'update', req.ip);

      res.json({
        status: 'success',
        data: patient
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get patient version history
router.get(
  '/:id/versions',
  verifyToken,
  authorize('doctor'),
  async (req, res) => {
    try {
      const patient = await Patient.findById(req.params.id)
        .populate('versions.modifiedBy', 'firstName lastName');

      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found'
        });
      }

      res.json({
        status: 'success',
        data: patient.versions
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get patient access log
router.get(
  '/:id/access-log',
  verifyToken,
  authorize('doctor', 'admin'),
  async (req, res) => {
    try {
      const patient = await Patient.findById(req.params.id)
        .populate('accessLog.userId', 'firstName lastName role');

      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found'
        });
      }

      res.json({
        status: 'success',
        data: patient.accessLog
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Add medical history
router.post(
  '/:id/medical-history',
  verifyToken,
  authorize('doctor'),
  [
    body('condition').notEmpty(),
    body('diagnosedDate').isISO8601(),
    body('status').isIn(['active', 'resolved', 'ongoing']),
    body('notes').optional().isString()
  ],
  logActivity('medical_history_add'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found'
        });
      }

      patient.medicalHistory.push(req.body);
      await patient.save();

      res.json({
        status: 'success',
        data: patient.medicalHistory[patient.medicalHistory.length - 1]
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Add vitals
router.post(
  '/:id/vitals',
  verifyToken,
  authorize('doctor', 'nurse'),
  validateVitals,
  logActivity('vitals_add'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found'
        });
      }

      const vitals = {
        ...req.body,
        recordedBy: req.user._id,
        date: new Date()
      };

      patient.vitals.push(vitals);
      await patient.save();

      res.json({
        status: 'success',
        data: patient.vitals[patient.vitals.length - 1]
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Add medication
router.post(
  '/:id/medications',
  verifyToken,
  authorize('doctor'),
  [
    body('name').notEmpty(),
    body('dosage').notEmpty(),
    body('frequency').notEmpty(),
    body('startDate').isISO8601(),
    body('endDate').optional().isISO8601()
  ],
  logActivity('medication_add'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found'
        });
      }

      const medication = {
        ...req.body,
        prescribedBy: req.user._id,
        status: 'active'
      };

      patient.medications.push(medication);
      await patient.save();

      res.json({
        status: 'success',
        data: patient.medications[patient.medications.length - 1]
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Add note
router.post(
  '/:id/notes',
  verifyToken,
  authorize('doctor', 'nurse'),
  [
    body('content').notEmpty(),
    body('type').isIn(['general', 'diagnosis', 'treatment', 'followUp'])
  ],
  logActivity('note_add'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found'
        });
      }

      const note = {
        ...req.body,
        author: req.user._id,
        date: new Date()
      };

      patient.notes.push(note);
      await patient.save();

      res.json({
        status: 'success',
        data: patient.notes[patient.notes.length - 1]
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get patient timeline
router.get(
  '/:id/timeline',
  verifyToken,
  authorize('doctor', 'nurse'),
  async (req, res) => {
    try {
      const patient = await Patient.findById(req.params.id)
        .populate('aiDiagnoses.reviewedBy', 'firstName lastName')
        .populate('medications.prescribedBy', 'firstName lastName')
        .populate('notes.author', 'firstName lastName')
        .populate('vitals.recordedBy', 'firstName lastName');

      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found'
        });
      }

      // Combine all events into a timeline
      const timeline = [
        ...patient.aiDiagnoses.map(d => ({
          type: 'diagnosis',
          date: d.date,
          data: d
        })),
        ...patient.medications.map(m => ({
          type: 'medication',
          date: m.startDate,
          data: m
        })),
        ...patient.notes.map(n => ({
          type: 'note',
          date: n.date,
          data: n
        })),
        ...patient.vitals.map(v => ({
          type: 'vitals',
          date: v.date,
          data: v
        }))
      ];

      // Sort by date descending
      timeline.sort((a, b) => b.date - a.date);

      res.json({
        status: 'success',
        data: timeline
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

module.exports = router; 