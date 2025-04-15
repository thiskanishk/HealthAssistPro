import { IMedication } from '../models/Medication';
import logger from './logger';

/**
 * Represents a standard dosage range for a medication
 */
export interface DosageRange {
  min: number;
  max: number;
  unit: string;
  frequency?: string;
  route?: string;
  ageGroup?: 'adult' | 'pediatric' | 'geriatric';
  weightBased?: boolean;
  condition?: string;
}

/**
 * Represents a medication's therapeutic levels in the blood
 */
export interface TherapeuticRange {
  min: number;
  max: number;
  unit: string;
  timing?: 'peak' | 'trough' | 'steady-state';
  condition?: string;
}

/**
 * Format for parsed dosage information
 */
export interface ParsedDosage {
  value: number;
  unit: string;
  frequency?: string;
  route?: string;
  isValid: boolean;
  validationMessage?: string;
}

/**
 * Utility class for analyzing medication data
 */
export class MedicationAnalyzer {
  private static instance: MedicationAnalyzer;
  
  // Common dosage units and their conversions to standard units
  private dosageUnitConversions: Record<string, { standardUnit: string; factor: number }> = {
    'mg': { standardUnit: 'mg', factor: 1 },
    'g': { standardUnit: 'mg', factor: 1000 },
    'mcg': { standardUnit: 'mg', factor: 0.001 },
    'ml': { standardUnit: 'ml', factor: 1 },
    'cc': { standardUnit: 'ml', factor: 1 },
    'l': { standardUnit: 'ml', factor: 1000 },
    'iu': { standardUnit: 'iu', factor: 1 },
    'u': { standardUnit: 'iu', factor: 1 },
    'meq': { standardUnit: 'meq', factor: 1 },
    'mmol': { standardUnit: 'mmol', factor: 1 },
  };
  
  // Regular expressions for parsing dosage strings
  private readonly DOSAGE_REGEX = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)(?:\s*([a-zA-Z0-9\s\/]+))?(?:\s*(oral|iv|im|sc|topical|inhalation|pr|sl))?/i;
  
  private constructor() {}
  
  public static getInstance(): MedicationAnalyzer {
    if (!MedicationAnalyzer.instance) {
      MedicationAnalyzer.instance = new MedicationAnalyzer();
    }
    return MedicationAnalyzer.instance;
  }
  
  /**
   * Parse a dosage string into structured data
   * @param dosageString The dosage string to parse (e.g., "10 mg twice daily")
   * @returns Parsed dosage information
   */
  public parseDosage(dosageString: string): ParsedDosage {
    try {
      if (!dosageString) {
        return {
          value: 0,
          unit: '',
          isValid: false,
          validationMessage: 'No dosage provided'
        };
      }
      
      const match = this.DOSAGE_REGEX.exec(dosageString);
      
      if (!match) {
        return {
          value: 0,
          unit: '',
          isValid: false,
          validationMessage: 'Invalid dosage format'
        };
      }
      
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();
      const frequency = match[3]?.trim().toLowerCase() || undefined;
      const route = match[4]?.trim().toLowerCase() || undefined;
      
      return {
        value,
        unit,
        frequency,
        route,
        isValid: true
      };
    } catch (error) {
      logger.error(`Error parsing dosage: ${error}`);
      return {
        value: 0,
        unit: '',
        isValid: false,
        validationMessage: 'Error parsing dosage'
      };
    }
  }
  
  /**
   * Check if a dosage is within the recommended range
   */
  public checkDosage(
    medication: IMedication, 
    dosageString: string, 
    patientWeight?: number,
    patientAge?: number,
    condition?: string
  ): { 
    isWithinRange: boolean; 
    message?: string; 
    recommendedRange?: DosageRange 
  } {
    try {
      const parsedDosage = this.parseDosage(dosageString);
      
      if (!parsedDosage.isValid) {
        return {
          isWithinRange: false,
          message: parsedDosage.validationMessage
        };
      }
      
      // If medication has no standard dosages defined, we can't validate
      if (!medication.standardDosages || medication.standardDosages.length === 0) {
        return {
          isWithinRange: true,
          message: 'No standard dosages defined for this medication'
        };
      }
      
      // Find the appropriate dosage range based on patient attributes
      let relevantDosage = this.findRelevantDosageRange(
        medication.standardDosages, 
        parsedDosage.unit, 
        parsedDosage.route, 
        patientAge, 
        condition
      );
      
      if (!relevantDosage) {
        return {
          isWithinRange: true,
          message: 'No matching dosage range found for the given parameters'
        };
      }
      
      // Convert to standard units if needed
      let normalizedValue = parsedDosage.value;
      if (parsedDosage.unit !== relevantDosage.unit) {
        const conversion = this.convertDosageUnits(parsedDosage.value, parsedDosage.unit, relevantDosage.unit);
        if (conversion.success) {
          normalizedValue = conversion.value;
        } else {
          return {
            isWithinRange: false,
            message: `Cannot compare different units: ${parsedDosage.unit} vs ${relevantDosage.unit}`
          };
        }
      }
      
      // Adjust for weight if necessary
      if (relevantDosage.weightBased && patientWeight) {
        const minDose = relevantDosage.min * patientWeight;
        const maxDose = relevantDosage.max * patientWeight;
        
        relevantDosage = {
          ...relevantDosage,
          min: minDose,
          max: maxDose
        };
      }
      
      // Check if dosage is within range
      const isWithinRange = normalizedValue >= relevantDosage.min && normalizedValue <= relevantDosage.max;
      
      if (isWithinRange) {
        return {
          isWithinRange: true,
          recommendedRange: relevantDosage
        };
      } else {
        return {
          isWithinRange: false,
          message: normalizedValue < relevantDosage.min 
            ? `Dosage too low. Recommended minimum: ${relevantDosage.min} ${relevantDosage.unit}` 
            : `Dosage too high. Recommended maximum: ${relevantDosage.max} ${relevantDosage.unit}`,
          recommendedRange: relevantDosage
        };
      }
    } catch (error) {
      logger.error(`Error checking dosage: ${error}`);
      return {
        isWithinRange: false,
        message: 'Error validating dosage'
      };
    }
  }
  
  /**
   * Find the relevant dosage range based on patient characteristics
   */
  private findRelevantDosageRange(
    standardDosages: DosageRange[],
    unit: string,
    route?: string,
    patientAge?: number,
    condition?: string
  ): DosageRange | undefined {
    // Filter by age group if available
    let relevantDosages = standardDosages;
    
    if (patientAge !== undefined) {
      const ageGroup = patientAge < 18 ? 'pediatric' : (patientAge > 65 ? 'geriatric' : 'adult');
      const ageSpecificDosages = relevantDosages.filter(d => d.ageGroup === ageGroup);
      
      if (ageSpecificDosages.length > 0) {
        relevantDosages = ageSpecificDosages;
      }
    }
    
    // Filter by route if provided
    if (route) {
      const routeSpecificDosages = relevantDosages.filter(d => 
        !d.route || d.route.toLowerCase() === route.toLowerCase()
      );
      
      if (routeSpecificDosages.length > 0) {
        relevantDosages = routeSpecificDosages;
      }
    }
    
    // Filter by condition if provided
    if (condition) {
      const conditionSpecificDosages = relevantDosages.filter(d => 
        !d.condition || d.condition.toLowerCase().includes(condition.toLowerCase())
      );
      
      if (conditionSpecificDosages.length > 0) {
        relevantDosages = conditionSpecificDosages;
      }
    }
    
    // Choose the first matching dosage range
    // Ideally this would match units exactly, but we could also add unit conversion
    return relevantDosages.find(d => d.unit === unit) || relevantDosages[0];
  }
  
  /**
   * Convert between different dosage units
   */
  private convertDosageUnits(
    value: number, 
    fromUnit: string, 
    toUnit: string
  ): { success: boolean; value: number } {
    try {
      fromUnit = fromUnit.toLowerCase();
      toUnit = toUnit.toLowerCase();
      
      // If units are the same, no conversion needed
      if (fromUnit === toUnit) {
        return { success: true, value };
      }
      
      const fromConversion = this.dosageUnitConversions[fromUnit];
      const toConversion = this.dosageUnitConversions[toUnit];
      
      // If we don't know one of the units, conversion fails
      if (!fromConversion || !toConversion) {
        return { success: false, value: 0 };
      }
      
      // If the standard units differ, conversion fails (can't convert mg to ml)
      if (fromConversion.standardUnit !== toConversion.standardUnit) {
        return { success: false, value: 0 };
      }
      
      // Convert to standard unit, then to target unit
      const standardValue = value * fromConversion.factor;
      const convertedValue = standardValue / toConversion.factor;
      
      return { success: true, value: convertedValue };
    } catch (error) {
      logger.error(`Error converting dosage units: ${error}`);
      return { success: false, value: 0 };
    }
  }
  
  /**
   * Check if a lab result for drug level is within therapeutic range
   */
  public checkTherapeuticLevel(
    medication: IMedication,
    labValue: number,
    labUnit: string,
    isTrough: boolean = false
  ): {
    isWithinRange: boolean;
    message?: string;
    recommendedRange?: TherapeuticRange;
  } {
    try {
      if (!medication.therapeuticLevels || medication.therapeuticLevels.length === 0) {
        return {
          isWithinRange: true,
          message: 'No therapeutic levels defined for this medication'
        };
      }
      
      // Find appropriate therapeutic range
      const timing = isTrough ? 'trough' : 'peak';
      let relevantRange = medication.therapeuticLevels.find((r: TherapeuticRange) => r.timing === timing);
      
      // If no specific timing range is found, use the first one
      if (!relevantRange) {
        relevantRange = medication.therapeuticLevels[0];
      }
      
      // Check if units match
      if (labUnit.toLowerCase() !== relevantRange.unit.toLowerCase()) {
        return {
          isWithinRange: false,
          message: `Unit mismatch: Lab result in ${labUnit}, therapeutic range in ${relevantRange.unit}`
        };
      }
      
      // Check if level is within range
      const isWithinRange = labValue >= relevantRange.min && labValue <= relevantRange.max;
      
      if (isWithinRange) {
        return {
          isWithinRange: true,
          recommendedRange: relevantRange
        };
      } else {
        return {
          isWithinRange: false,
          message: labValue < relevantRange.min 
            ? `Level too low. Therapeutic minimum: ${relevantRange.min} ${relevantRange.unit}` 
            : `Level too high. Therapeutic maximum: ${relevantRange.max} ${relevantRange.unit}`,
          recommendedRange: relevantRange
        };
      }
    } catch (error) {
      logger.error(`Error checking therapeutic level: ${error}`);
      return {
        isWithinRange: false,
        message: 'Error validating therapeutic level'
      };
    }
  }
  
  /**
   * Calculate the time to reach steady state for a medication
   * @param halfLife Half-life of the medication in hours
   * @returns Time to steady state in hours (approximately 5 half-lives)
   */
  public calculateTimeToSteadyState(halfLife: number): number {
    // Steady state is reached after approximately 5 half-lives
    return halfLife * 5;
  }
  
  /**
   * Analyze potential adverse effects based on medication and patient factors
   */
  public analyzeAdverseEffectRisk(
    medications: IMedication[],
    patientAge?: number,
    patientGender?: string,
    renalFunction?: number,
    hepaticFunction?: string
  ): Array<{
    medicationName: string;
    risks: Array<{ effect: string; probability: 'high' | 'medium' | 'low'; reason: string }>;
  }> {
    try {
      const results = [];
      
      for (const medication of medications) {
        const risks: Array<{ effect: string; probability: 'high' | 'medium' | 'low'; reason: string }> = [];
        
        // Check age-related risks
        if (patientAge && patientAge > 65 && medication.geriatricPrecautions) {
          for (const precaution of medication.geriatricPrecautions) {
            risks.push({
              effect: precaution,
              probability: 'medium',
              reason: 'Geriatric patient'
            });
          }
        }
        
        // Check gender-specific risks
        if (patientGender && medication.genderSpecificRisks) {
          const gender = patientGender.toLowerCase() as 'male' | 'female';
          if (gender === 'male' || gender === 'female') {
            const genderRisks = medication.genderSpecificRisks[gender];
            if (genderRisks) {
              for (const risk of genderRisks) {
                risks.push({
                  effect: risk,
                  probability: 'medium',
                  reason: `${patientGender}-specific risk`
                });
              }
            }
          }
        }
        
        // Check renal function risks
        if (renalFunction && renalFunction < 60 && medication.renalAdjustment) {
          risks.push({
            effect: 'Medication accumulation',
            probability: renalFunction < 30 ? 'high' : 'medium',
            reason: 'Decreased renal function'
          });
        }
        
        // Check hepatic function risks
        if (hepaticFunction && hepaticFunction === 'impaired' && medication.hepaticAdjustment) {
          risks.push({
            effect: 'Altered metabolism',
            probability: 'high',
            reason: 'Hepatic impairment'
          });
        }
        
        // Add to results if there are any risks
        if (risks.length > 0) {
          results.push({
            medicationName: medication.name,
            risks
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error(`Error analyzing adverse effect risks: ${error}`);
      return [];
    }
  }
}

// Export the singleton instance
export default MedicationAnalyzer.getInstance(); 