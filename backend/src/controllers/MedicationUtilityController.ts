import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import medicationAnalyzer from '../utils/medicationAnalyzer';

/**
 * Controller for medication utility endpoints
 */
class MedicationUtilityController {
  /**
   * Parse and analyze a medication dosage
   */
  public analyzeDosage = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { dosage } = req.body;
        
        if (!dosage) {
          return res.status(400).json({
            success: false,
            error: 'Dosage is required'
          });
        }
        
        // Parse the dosage
        const parsedDosage = medicationAnalyzer.parseDosage(dosage);
        
        return res.status(200).json({
          success: true,
          data: {
            dosage,
            parsedDosage,
            isValid: parsedDosage.isValid,
            message: parsedDosage.validationMessage
          }
        });
      } catch (error) {
        logger.error(`Error analyzing dosage: ${error}`);
        next(error);
      }
    }
  );
  
  /**
   * Calculate time to steady state for a medication
   */
  public calculateSteadyState = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { halfLife } = req.body;
        
        if (!halfLife || isNaN(Number(halfLife)) || Number(halfLife) <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Valid half-life value is required (positive number)'
          });
        }
        
        const halfLifeValue = Number(halfLife);
        const steadyStateTime = medicationAnalyzer.calculateTimeToSteadyState(halfLifeValue);
        
        return res.status(200).json({
          success: true,
          data: {
            halfLife: halfLifeValue,
            timeToSteadyState: steadyStateTime,
            timeToSteadyStateFormatted: this.formatTimeToHumanReadable(steadyStateTime)
          }
        });
      } catch (error) {
        logger.error(`Error calculating steady state: ${error}`);
        next(error);
      }
    }
  );
  
  /**
   * Format time in hours to a human-readable format
   */
  private formatTimeToHumanReadable(timeInHours: number): string {
    const days = Math.floor(timeInHours / 24);
    const hours = Math.round(timeInHours % 24);
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  }
}

export default new MedicationUtilityController(); 