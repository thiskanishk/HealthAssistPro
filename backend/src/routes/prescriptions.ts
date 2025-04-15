import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middleware/validation';
import prescriptionController from '../controllers/PrescriptionController';

const router = Router();

const prescriptionValidation = [
  body('patientId').isString().notEmpty().withMessage('Patient ID is required'),
  body('medications').isArray().withMessage('Medications must be an array'),
  body('medications.*.name').isString().notEmpty().withMessage('Medication name is required'),
  body('medications.*.dosage').isString().notEmpty().withMessage('Medication dosage is required'),
  body('medications.*.frequency').isString().notEmpty().withMessage('Medication frequency is required'),
  body('medications.*.duration').optional().isInt().withMessage('Duration must be a number'),
  body('medications.*.notes').optional().isString().withMessage('Notes must be a string')
];

/**
 * @swagger
 * /api/prescriptions:
 *   get:
 *     summary: Get all prescriptions for a patient
 *     tags: [Prescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the patient
 *     responses:
 *       200:
 *         description: List of prescriptions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', [
  query('patientId').isString().notEmpty().withMessage('Patient ID is required')
], validate(), prescriptionController.getPrescriptions);

/**
 * @swagger
 * /api/prescriptions:
 *   post:
 *     summary: Create a new prescription
 *     tags: [Prescriptions]
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
 *               - medications
 *             properties:
 *               patientId:
 *                 type: string
 *               medications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - dosage
 *                     - frequency
 *                   properties:
 *                     name:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: string
 *                     duration:
 *                       type: number
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Prescription created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', prescriptionValidation, validate(), prescriptionController.createPrescription);

export default router;
