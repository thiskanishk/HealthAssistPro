const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const aiDiagnosisService = require('../services/aiDiagnosis');
const Patient = require('../models/Patient');
const { verifyToken, authorize, logActivity } = require('../middleware/auth');

// Validation middleware
const validateDiagnosisRequest = [
  body('patientId').isMongoId(),
  body('symptoms').isArray().notEmpty(),
  body('symptoms.*').isString().trim().notEmpty(),
  body('notes').optional().isString()
];

const validateFeedback = [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comments').optional().isString()
];

// Request new diagnosis
router.post(
  '/request',
  verifyToken,
  authorize('doctor', 'nurse'),
  validateDiagnosisRequest,
  logActivity('diagnosis_request'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const { patientId, symptoms, notes } = req.body;

      // Get patient data
      const patient = await Patient.findById(patientId)
        .populate('medicalHistory')
        .populate('medications')
        .populate('allergies')
        .populate('vitals');

      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found'
        });
      }

      // Prepare patient data for AI diagnosis
      const patientData = {
        age: calculateAge(patient.dateOfBirth),
        gender: patient.gender,
        symptoms,
        medicalHistory: patient.medicalHistory,
        medications: patient.medications,
        allergies: patient.allergies,
        vitals: patient.vitals[patient.vitals.length - 1] // Get most recent vitals
      };

      // Get AI diagnosis
      const diagnosis = await aiDiagnosisService.getDiagnosis(patientData);

      // Validate diagnosis results
      aiDiagnosisService.validateDiagnosis(diagnosis);

      // Save diagnosis to patient record
      const aiDiagnosis = {
        date: new Date(),
        symptoms,
        conditions: diagnosis.diagnoses,
        recommendedTests: diagnosis.recommendedTests,
        treatmentSuggestions: diagnosis.treatmentSuggestions,
        notes,
        reviewedBy: req.user._id,
        status: 'pending'
      };

      patient.aiDiagnoses.push(aiDiagnosis);
      await patient.save();

      res.json({
        status: 'success',
        data: {
          diagnosisId: patient.aiDiagnoses[patient.aiDiagnoses.length - 1]._id,
          diagnosis
        }
      });
    } catch (error) {
      console.error('Diagnosis request error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get diagnosis by ID
router.get(
  '/:diagnosisId',
  verifyToken,
  authorize('doctor', 'nurse'),
  async (req, res) => {
    try {
      const patient = await Patient.findOne({
        'aiDiagnoses._id': req.params.diagnosisId
      });

      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Diagnosis not found'
        });
      }

      const diagnosis = patient.aiDiagnoses.id(req.params.diagnosisId);

      res.json({
        status: 'success',
        data: diagnosis
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Update diagnosis status
router.patch(
  '/:diagnosisId/status',
  verifyToken,
  authorize('doctor'),
  body('status').isIn(['reviewed', 'confirmed', 'rejected']),
  logActivity('diagnosis_status_update'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const patient = await Patient.findOne({
        'aiDiagnoses._id': req.params.diagnosisId
      });

      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Diagnosis not found'
        });
      }

      const diagnosis = patient.aiDiagnoses.id(req.params.diagnosisId);
      diagnosis.status = req.body.status;
      diagnosis.reviewedBy = req.user._id;

      await patient.save();

      res.json({
        status: 'success',
        data: diagnosis
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Submit feedback for diagnosis
router.post(
  '/:diagnosisId/feedback',
  verifyToken,
  authorize('doctor', 'nurse'),
  validateFeedback,
  logActivity('diagnosis_feedback'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const patient = await Patient.findOne({
        'aiDiagnoses._id': req.params.diagnosisId
      });

      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Diagnosis not found'
        });
      }

      const diagnosis = patient.aiDiagnoses.id(req.params.diagnosisId);
      diagnosis.feedback = {
        rating: req.body.rating,
        comments: req.body.comments,
        providedBy: req.user._id
      };

      await patient.save();

      // Process feedback asynchronously
      aiDiagnosisService.processFeedback(req.params.diagnosisId, diagnosis.feedback)
        .catch(console.error);

      res.json({
        status: 'success',
        data: diagnosis
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Helper function to calculate age
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

module.exports = router; 