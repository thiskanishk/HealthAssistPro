import { Router, Request, Response } from 'express';
import { DiagnosisController } from '../controllers/DiagnosisController';
import { validate } from '../middleware/validation';
import { verifyToken, logActivity } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import Patient from '../models/Patient';
import { DiagnosisModel } from '../models/Diagnosis';

const router = Router();
const diagnosisController = new DiagnosisController();

// Validation rules
const diagnosisValidation = [
  body('symptoms').isArray().withMessage('Symptoms must be an array'),
  body('patientId').isString().withMessage('Patient ID is required')
];

const validateDiagnosisRequest = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('symptoms').isArray().notEmpty().withMessage('Symptoms must be a non-empty array'),
  body('symptoms.*').isString().trim().notEmpty().withMessage('Each symptom must be a non-empty string'),
  body('notes').optional().isString().withMessage('Notes must be a string')
];

const validateFeedback = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comments').optional().isString().withMessage('Comments must be a string')
];

/**
 * Helper function to calculate age from date of birth
 */
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * @swagger
 * /api/diagnosis/analyze:
 *   post:
 *     summary: Analyze symptoms and provide diagnosis
 *     description: Analyze patient symptoms and provide AI-powered diagnosis
 *     tags: [Diagnosis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - symptoms
 *               - patientId
 *             properties:
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: string
 *               patientId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/analyze', verifyToken, validate(diagnosisValidation), async (req: Request, res: Response) => {
  await diagnosisController.analyzeSymptomsAndDiagnose(req, res, (err: any) => {
    if (err) {
      console.error('Error in diagnosis analysis:', err);
      res.status(500).json({
        status: 'error',
        message: err.message || 'An error occurred during diagnosis analysis'
      });
    }
  });
});

/**
 * @swagger
 * /api/diagnosis/request:
 *   post:
 *     summary: Request a new diagnosis
 *     description: Request a new diagnosis based on patient symptoms
 *     tags: [Diagnosis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - symptoms
 *             properties:
 *               patientId:
 *                 type: string
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Diagnosis request submitted successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Patient not found
 */
router.post(
  '/request',
  verifyToken,
  validate(validateDiagnosisRequest),
  logActivity('diagnosis_request'),
  async (req: Request, res: Response) => {
    try {
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
        medicalHistory: patient.medicalHistory || [],
        medications: patient.medications || [],
        allergies: patient.allergies || [],
        vitals: patient.vitalSigns || {}
      };

      // Get AI diagnosis using the controller
      const diagnosisResult = await diagnosisController.generateDiagnosis(patientData);

      // Create a new diagnosis record using the DiagnosisModel
      const diagnosis = new DiagnosisModel({
        patientId: patientId,
        clinicianId: req.user?.id,
        chiefComplaint: symptoms[0] || 'Multiple symptoms',
        symptoms,
        vitalSigns: {
          temperature: patient.vitalSigns?.temperature,
          bloodPressure: {
            systolic: typeof patient.vitalSigns?.bloodPressure === 'string' 
              ? parseInt(patient.vitalSigns.bloodPressure.split('/')[0], 10) || 120
              : 120,
            diastolic: typeof patient.vitalSigns?.bloodPressure === 'string'
              ? parseInt(patient.vitalSigns.bloodPressure.split('/')[1], 10) || 80
              : 80
          },
          heartRate: patient.vitalSigns?.heartRate,
          respiratoryRate: patient.vitalSigns?.respiratoryRate,
          oxygenSaturation: patient.vitalSigns?.oxygenSaturation,
          weight: patient.vitalSigns?.weight,
          height: patient.vitalSigns?.height
        },
        medicalConditions: diagnosisResult.diagnoses.map(d => ({
          name: d.condition,
          confidence: d.confidence,
          description: '',
          recommendedTreatments: diagnosisResult.treatmentSuggestions || []
        })),
        treatmentPlan: Array.isArray(diagnosisResult.treatmentSuggestions) 
          ? diagnosisResult.treatmentSuggestions.join('\n') 
          : '',
        notes: notes || '',
        aiGenerated: true,
        status: 'preliminary'
      });

      await diagnosis.save();

      res.json({
        status: 'success',
        data: {
          diagnosisId: diagnosis._id,
          diagnosis: diagnosisResult
        }
      });
    } catch (error: any) {
      console.error('Diagnosis request error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/diagnosis/patient/{patientId}:
 *   get:
 *     summary: Get all diagnoses for a patient
 *     description: Retrieve all diagnoses for a specific patient
 *     tags: [Diagnosis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Diagnoses retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Patient not found
 */
router.get('/patient/:patientId', verifyToken, async (req: Request, res: Response) => {
  try {
    await diagnosisController.getPatientDiagnoses(req, res, (err: any) => {
      if (err) {
        console.error('Error retrieving patient diagnoses:', err);
        res.status(500).json({
          status: 'error',
          message: err.message || 'An error occurred while retrieving diagnoses'
        });
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/diagnosis/{patientId}/{diagnosisId}:
 *   get:
 *     summary: Get diagnosis by ID
 *     description: Retrieve a diagnosis by its ID for a specific patient
 *     tags: [Diagnosis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: diagnosisId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Diagnosis retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Diagnosis not found
 */
router.get('/:patientId/:diagnosisId', verifyToken, async (req: Request, res: Response) => {
  try {
    await diagnosisController.getDiagnosisById(req, res, (err: any) => {
      if (err) {
        console.error('Error retrieving diagnosis:', err);
        res.status(500).json({
          status: 'error',
          message: err.message || 'An error occurred while retrieving the diagnosis'
        });
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/diagnosis/{diagnosisId}/feedback:
 *   post:
 *     summary: Submit feedback for a diagnosis
 *     description: Submit feedback and rating for an AI diagnosis
 *     tags: [Diagnosis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: diagnosisId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Feedback submitted successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Diagnosis not found
 */
router.post(
  '/:diagnosisId/feedback',
  verifyToken,
  validate(validateFeedback),
  async (req: Request, res: Response) => {
    try {
      const { rating, comments } = req.body;
      const { diagnosisId } = req.params;

      await diagnosisController.processFeedback(diagnosisId, {
        rating,
        comments,
        providedBy: req.user?.id || ''
      });

      res.json({
        status: 'success',
        message: 'Feedback submitted successfully'
      });
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

export default router; 