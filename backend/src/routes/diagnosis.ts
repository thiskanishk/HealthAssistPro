import { Router, Request, Response } from 'express';
import diagnosisController from '../controllers/DiagnosisController';
import { validate } from '../middleware/validation';
import { verifyToken, logActivity } from '../middleware/auth';
import { body } from 'express-validator';

const router = Router();

// Validation rules
const diagnosisValidation = [
  body('symptoms').isArray().withMessage('Symptoms must be an array'),
  body('patientId').isString().withMessage('Patient ID is required')
];

const validateDiagnosisRequest = [
  body('patientId').isString().notEmpty().withMessage('Valid patient ID is required'),
  body('symptoms').isArray().notEmpty().withMessage('Symptoms must be a non-empty array'),
  body('symptoms.*').isString().trim().notEmpty().withMessage('Each symptom must be a non-empty string'),
  body('notes').optional().isString().withMessage('Notes must be a string')
];

const validateFeedback = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comments').optional().isString().withMessage('Comments must be a string')
];

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
router.post('/analyze', verifyToken, validate(diagnosisValidation), (req: Request, res: Response) => {
  try {
    diagnosisController.analyzeSymptomsAndDiagnose(req, res);
  } catch (err: any) {
    console.error('Error in diagnosis analysis:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'An error occurred during diagnosis analysis'
    });
  }
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
 *       201:
 *         description: Diagnosis request created
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/request', verifyToken, validate(validateDiagnosisRequest), logActivity('diagnosis_request'), async (req: Request, res: Response) => {
  try {
    await diagnosisController.requestDiagnosis(req, res);
  } catch (err: any) {
    console.error('Error requesting diagnosis:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'An error occurred while requesting diagnosis'
    });
  }
});

/**
 * @swagger
 * /api/diagnosis/{patientId}/{diagnosisId}:
 *   get:
 *     summary: Get a specific diagnosis by ID
 *     tags: [Diagnosis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the patient
 *       - in: path
 *         name: diagnosisId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the diagnosis
 *     responses:
 *       200:
 *         description: Diagnosis details
 *       404:
 *         description: Diagnosis not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:patientId/:diagnosisId', verifyToken, async (req: Request, res: Response) => {
  try {
    await diagnosisController.getDiagnosisById(req, res);
  } catch (err: any) {
    console.error('Error retrieving diagnosis:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'An error occurred while retrieving diagnosis'
    });
  }
});

export default router;
