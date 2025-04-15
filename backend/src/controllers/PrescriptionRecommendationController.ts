import { Request, Response, NextFunction } from 'express';
import prescriptionRecommendationService, { ComprehensivePrescriptionInput, PrescriptionRecommendationError } from '../services/PrescriptionRecommendationService';
import logger from '../utils/logger';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler';
import { MedicationRepository } from '../repositories/MedicationRepository';
import { MedicationSafetyMonitor } from '../services/MedicationSafetyMonitor';
import medicationAnalyzer from '../utils/medicationAnalyzer';

/**
 * Controller for prescription recommendation endpoints
 */
class PrescriptionRecommendationController {
  /**
   * Validation rules for recommendation requests
   */
  public static validationRules = [
    body('patientId').isString().withMessage('Patient ID is required'),
    body('symptoms').isArray().withMessage('Symptoms must be an array'),
    body('vitalSigns').optional().isObject().withMessage('Vital signs must be an object'),
    body('labResults').optional().isArray().withMessage('Lab results must be an array'),
    body('currentMedications').optional().isArray().withMessage('Current medications must be an array'),
    body('allergies').optional().isArray().withMessage('Allergies must be an array'),
    body('patientAge').optional().isInt({ min: 0, max: 120 }).withMessage('Age must be between 0 and 120'),
    body('patientWeight').optional().isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
    body('patientHeight').optional().isFloat({ min: 0 }).withMessage('Height must be a positive number'),
    body('renalFunction').optional().isFloat({ min: 0 }).withMessage('Renal function must be a positive number'),
    body('hepaticFunction').optional().isString().withMessage('Hepatic function must be a string'),
    body('isPregnant').optional().isBoolean().withMessage('isPregnant must be a boolean'),
    body('relevantConditions').optional().isArray().withMessage('Relevant conditions must be an array'),
    body('medicationHistory').optional().isArray().withMessage('Medication history must be an array'),
    body('treatmentGoals').optional().isArray().withMessage('Treatment goals must be an array'),
  ];
  
  /**
   * Generate comprehensive medication recommendations
   */
  public generateRecommendations = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      try {
        const input: ComprehensivePrescriptionInput = req.body;
        logger.info(`Generating recommendations for patient: ${input.patientId || 'unnamed'}`);
        
        const recommendations = await prescriptionRecommendationService.generateRecommendations(input);
        
        // Log summary of recommendations
        logger.info(`Generated ${recommendations.length} recommendations for patient`);
        
        return res.status(200).json({
          success: true,
          data: recommendations,
          meta: {
            count: recommendations.length,
            generatedAt: new Date(),
          }
        });
      } catch (error) {
        logger.error(`Error generating recommendations: ${error}`);
        
        // Determine if this is a validation error from the service
        if (error instanceof Error && error.name === 'ValidationError') {
          return res.status(400).json({
            success: false,
            error: error.message
          });
        }
        
        // Forward to the error handler for other errors
        next(error);
      }
    }
  );
  
  /**
   * Get detailed information about a specific medication
   */
  public getMedicationDetails = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { medicationName } = req.params;
        const { patientId, age, weight, conditions } = req.query;
        
        // Convert query parameters
        const patientAge = age ? parseInt(age as string) : undefined;
        const patientWeight = weight ? parseFloat(weight as string) : undefined;
        const relevantConditions = conditions ? (conditions as string).split(',') : undefined;
        
        // Get medication repository
        const medicationRepo = MedicationRepository.getInstance();
        
        // Find medication by name
        const medications = await medicationRepo.getMedicationsByName(medicationName);
        
        if (medications.length === 0) {
          return res.status(404).json({
            success: false,
            error: `Medication ${medicationName} not found`
          });
        }
        
        const medication = medications[0];
        
        // Check for safety issues if patient context is provided
        let safetyInfo = null;
        if (patientId) {
          const safetyMonitor = MedicationSafetyMonitor.getInstance();
          safetyInfo = await safetyMonitor.checkMedicationSafety(
            [medication._id.toString()],
            patientId as string,
            undefined,
            relevantConditions
          );
        }
        
        // Analyze potential side effects for this patient
        let sideEffectRisks = null;
        if (patientAge) {
          sideEffectRisks = medicationAnalyzer.analyzeAdverseEffectRisk(
            [medication],
            patientAge,
            undefined,
            undefined,
            undefined
          );
        }
        
        return res.status(200).json({
          success: true,
          data: {
            medication,
            safetyInfo,
            sideEffectRisks
          }
        });
      } catch (error) {
        logger.error(`Error fetching medication details: ${error}`);
        next(error);
      }
    }
  );
  
  /**
   * Analyze dosage appropriateness
   */
  public analyzeDosage = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { medicationName, dosage } = req.body;
        const { age, weight, condition } = req.body;
        
        // Get medication repository
        const medicationRepo = MedicationRepository.getInstance();
        
        // Find medication
        const medications = await medicationRepo.getMedicationsByName(medicationName);
        
        if (medications.length === 0) {
          return res.status(404).json({
            success: false,
            error: `Medication ${medicationName} not found`
          });
        }
        
        const medication = medications[0];
        
        // Parse the dosage
        const parsedDosage = medicationAnalyzer.parseDosage(dosage);
        
        if (!parsedDosage.isValid) {
          return res.status(400).json({
            success: false,
            error: parsedDosage.validationMessage,
            data: { parsedDosage }
          });
        }
        
        // Check the dosage against standard ranges
        const dosageCheck = medicationAnalyzer.checkDosage(
          medication,
          dosage,
          weight,
          age,
          condition
        );
        
        return res.status(200).json({
          success: true,
          data: {
            medication: medicationName,
            dosage,
            parsedDosage,
            isWithinRange: dosageCheck.isWithinRange,
            message: dosageCheck.message,
            recommendedRange: dosageCheck.recommendedRange
          }
        });
      } catch (error) {
        logger.error(`Error analyzing dosage: ${error}`);
        next(error);
      }
    }
  );
}

export default new PrescriptionRecommendationController(); 