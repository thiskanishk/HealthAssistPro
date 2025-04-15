import express from 'express';
import medicationUtilityController from '../controllers/MedicationUtilityController';
import { validate } from '../middleware/validation';
import { body } from 'express-validator';

const router = express.Router();

/**
 * @route   POST /api/medication-utils/analyze-dosage
 * @desc    Analyze a medication dosage
 * @access  Public
 */
router.post(
  '/analyze-dosage',
  [
    body('dosage').isString().notEmpty().withMessage('Dosage string is required')
  ],
  validate,
  medicationUtilityController.analyzeDosage
);

/**
 * @route   POST /api/medication-utils/steady-state
 * @desc    Calculate time to reach steady state based on half-life
 * @access  Public
 */
router.post(
  '/steady-state',
  [
    body('halfLife').isFloat({ min: 0.1 }).withMessage('Half-life must be a positive number')
  ],
  validate,
  medicationUtilityController.calculateSteadyState
);

export default router; 