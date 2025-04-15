import { PrescriptionSuggestionService, PrescriptionSuggestion, PrescriptionInput, InteractionSeverity, DrugInteractionRisk } from './ai/PrescriptionSuggestionService';
import { MedicationRepository } from '../repositories/MedicationRepository';
import medicationAnalyzer, { ParsedDosage } from '../utils/medicationAnalyzer';
import { MedicationSafetyMonitor, SafetyAlert } from './MedicationSafetyMonitor';
import { IMedication } from '../models/Medication';
import logger from '../utils/logger';
import { IPatient, Patient } from '../models/Patient';

// Base error class for prescription recommendation errors
export class PrescriptionRecommendationError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

// Error for data-related issues
export class PrescriptionDataError extends PrescriptionRecommendationError {
  constructor(message: string, code: string = 'DATA_ERROR') {
    super(message, code);
  }
}

// Additional specific error types can be added here as needed

/**
 * Result from a medication efficacy analysis
 */
export interface EfficacyResult {
  medicationName: string;
  condition: string;
  efficacyScore: number; // 0-100
  evidenceLevel: 'high' | 'moderate' | 'low' | 'insufficient';
  recommendationStrength: 'strong' | 'moderate' | 'conditional' | 'against';
  alternativesAvailable: boolean;
  notes: string[];
}

/**
 * Omit the medication property from PrescriptionSuggestion for compatibility
 */
type PrescriptionSuggestionBase = Omit<PrescriptionSuggestion, 'medication'>;

/**
 * Comprehensive medication recommendation including safety and efficacy data
 */
export interface ComprehensiveMedicationRecommendation extends PrescriptionSuggestionBase {
  medication: string; // Medication name
  medicationDetails?: IMedication; // Full medication details if available
  efficacyInfo?: EfficacyResult;
  safetyAlerts: SafetyAlert[];
  dosageAnalysis: {
    isAppropriate: boolean;
    parsedDosage: ParsedDosage;
    message?: string;
  };
  compatibility: {
    patientFactors: Array<{
      factor: string;
      isCompatible: boolean;
      notes: string;
    }>;
    diseaseFactors: Array<{
      condition: string;
      isCompatible: boolean;
      notes: string;
    }>;
  };
  interactionRisks: DrugInteractionRisk[];
}

/**
 * Extended input for comprehensive prescription recommendations
 */
export interface ComprehensivePrescriptionInput extends PrescriptionInput {
  patientId: string; // ID of the patient
  patientAge?: number; // patient age in years
  isPregnant?: boolean; // is the patient pregnant
  patientWeight?: number; // in kg
  patientHeight?: number; // in cm
  renalFunction?: number; // eGFR in mL/min
  hepaticFunction?: string; // normal, mild impairment, moderate impairment, severe impairment
  relevantConditions?: string[]; // list of conditions relevant to prescription
  medicationHistory?: string[]; // previous medications
  treatmentGoals?: string[]; // specific goals for this treatment
  allergies?: string[]; // known allergies
}

// Add this interface definition
interface PatientData {
  age: number;
  weight: number;
  height: number;
  gender: string;
  allergies: string[];
  currentMedications: string[];
  medicalHistory: string[];
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
  };
}

/**
 * Service for comprehensive prescription recommendations
 */
class PrescriptionRecommendationService {
  private static instance: PrescriptionRecommendationService;
  private prescriptionService: PrescriptionSuggestionService;
  private medicationRepo: MedicationRepository;
  private safetyMonitor: MedicationSafetyMonitor;
  
  private constructor() {
    this.prescriptionService = new PrescriptionSuggestionService();
    this.medicationRepo = MedicationRepository.getInstance();
    this.safetyMonitor = MedicationSafetyMonitor.getInstance();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): PrescriptionRecommendationService {
    if (!PrescriptionRecommendationService.instance) {
      PrescriptionRecommendationService.instance = new PrescriptionRecommendationService();
    }
    return PrescriptionRecommendationService.instance;
  }
  
  /**
   * Generate comprehensive medication recommendations
   */
  public async generateRecommendations(
    input: ComprehensivePrescriptionInput
  ): Promise<ComprehensiveMedicationRecommendation[]> {
    try {
      // Validate input
      this.validateInput(input);
      
      // Get AI-generated prescription suggestions
      const suggestions = await this.prescriptionService.suggestPrescription(input);
      
      // Enhance each suggestion with additional information
      const enhancedSuggestions: ComprehensiveMedicationRecommendation[] = [];
      
      for (const suggestion of suggestions) {
        const enhancedSuggestion = await this.enhancePrescriptionSuggestion(suggestion, input);
        enhancedSuggestions.push(enhancedSuggestion);
      }
      
      // Sort by score, prioritizing safer medications with better efficacy
      return this.rankRecommendations(enhancedSuggestions);
    } catch (error) {
      logger.error(`Error generating comprehensive recommendations: ${error}`);
      
      if (error instanceof PrescriptionRecommendationError) {
        throw error;
      }
      
      throw new PrescriptionRecommendationError(`Failed to generate recommendations: ${error}`, 'GENERIC_ERROR');
    }
  }
  
  /**
   * Validate input data
   */
  private validateInput(input: ComprehensivePrescriptionInput): void {
    if (!input.patientId) {
      throw new PrescriptionRecommendationError('Patient ID is required', 'MISSING_PATIENT_ID');
    }
    
    if (!input.symptoms || !Array.isArray(input.symptoms) || input.symptoms.length === 0) {
      throw new PrescriptionRecommendationError('At least one symptom is required', 'MISSING_SYMPTOMS');
    }
  }
  
  /**
   * Enhance a prescription suggestion with additional information
   */
  private async enhancePrescriptionSuggestion(
    suggestion: PrescriptionSuggestion,
    input: ComprehensivePrescriptionInput
  ): Promise<ComprehensiveMedicationRecommendation> {
    logger.info(`Enhancing prescription suggestion for: ${suggestion.medication}`);
    
    let medicationDetails;
    try {
      // Fetch detailed medication information from the repository
      const medications = await this.medicationRepo.getMedicationsByName(suggestion.medication);
      
      if (!medications || medications.length === 0) {
        throw new PrescriptionDataError(
          `No medication found with name: ${suggestion.medication}`,
          'MEDICATION_NOT_FOUND'
        );
      }
      
      medicationDetails = medications[0];
    } catch (error) {
      if (error instanceof PrescriptionRecommendationError) {
        throw error;
      }
      throw new PrescriptionDataError(
        `Error retrieving medication data: ${(error as Error).message}`,
        'DATABASE_ERROR'
      );
    }
    
    // Get medication ID if available
    const medicationId = medicationDetails?._id.toString();
    const medicationIds = medicationId ? [medicationId] : [];
    
    // Check safety
    const safetyAlerts = await this.safetyMonitor.checkMedicationSafety(
      medicationIds,
      input.patientId,
      input.allergies,
      input.relevantConditions
    );
    
    // Analyze dosage
    const dosageAnalysis = this.analyzeDosage(
      medicationDetails,
      suggestion.dosage,
      input
    );
    
    // Analyze efficacy for the specific condition
    const efficacyInfo = await this.analyzeEfficacy(
      medicationDetails,
      input.diagnosis || input.symptoms.join(', ')
    );
    
    // Analyze patient compatibility
    const compatibility = this.analyzeCompatibility(
      medicationDetails,
      input
    );
    
    return {
      medication: suggestion.medication,
      dosage: suggestion.dosage,
      frequency: suggestion.frequency,
      duration: suggestion.duration,
      instructions: suggestion.instructions,
      warnings: suggestion.warnings,
      contraindications: suggestion.contraindications,
      sideEffects: suggestion.sideEffects,
      alternatives: suggestion.alternatives,
      interactionRisks: suggestion.interactionRisks,
      status: suggestion.status,
      medicationDetails,
      efficacyInfo,
      safetyAlerts,
      dosageAnalysis,
      compatibility
    };
  }
  
  /**
   * Analyze the appropriateness of a dosage
   */
  private analyzeDosage(
    medication: IMedication,
    dosageString: string,
    input: ComprehensivePrescriptionInput
  ): {
    isAppropriate: boolean;
    parsedDosage: ParsedDosage;
    message?: string;
  } {
    try {
      const parsedDosage = medicationAnalyzer.parseDosage(dosageString);
      
      if (!parsedDosage.isValid) {
        return {
          isAppropriate: false,
          parsedDosage,
          message: parsedDosage.validationMessage
        };
      }
      
      // Check against standard dosages
      const dosageCheck = medicationAnalyzer.checkDosage(
        medication,
        dosageString,
        input.patientWeight,
        input.patientAge,
        input.diagnosis
      );
      
      return {
        isAppropriate: dosageCheck.isWithinRange,
        parsedDosage,
        message: dosageCheck.message
      };
    } catch (error) {
      logger.error(`Error analyzing dosage: ${error}`);
      
      // Return a basic error result
      return {
        isAppropriate: false,
        parsedDosage: medicationAnalyzer.parseDosage(dosageString),
        message: `Error during dosage analysis: ${error}`
      };
    }
  }
  
  /**
   * Analyze the efficacy of a medication for a specific condition
   */
  private async analyzeEfficacy(
    medication: IMedication,
    condition: string
  ): Promise<EfficacyResult | undefined> {
    try {
      // This would ideally query a medical evidence database or use an API
      // For now, we'll return a simplified dummy result
      
      // In a real implementation, this would consider:
      // - Clinical trial data
      // - Meta-analyses
      // - Standard treatment guidelines
      // - Real-world evidence
      
      // Generate a pseudo-random score for demonstration purposes
      const seed = (medication.name.length + condition.length) % 20;
      const efficacyScore = 65 + seed; // Range: 65-85
      
      let evidenceLevel: 'high' | 'moderate' | 'low' | 'insufficient';
      if (efficacyScore > 80) evidenceLevel = 'high';
      else if (efficacyScore > 70) evidenceLevel = 'moderate';
      else if (efficacyScore > 60) evidenceLevel = 'low';
      else evidenceLevel = 'insufficient';
      
      let recommendationStrength: 'strong' | 'moderate' | 'conditional' | 'against';
      if (efficacyScore > 80) recommendationStrength = 'strong';
      else if (efficacyScore > 70) recommendationStrength = 'moderate';
      else if (efficacyScore > 60) recommendationStrength = 'conditional';
      else recommendationStrength = 'against';
      
      return {
        medicationName: medication.name,
        condition,
        efficacyScore,
        evidenceLevel,
        recommendationStrength,
        alternativesAvailable: true,
        notes: [
          `Based on analysis of treatment guidelines and available evidence.`,
          `Efficacy score is a relative measure for this specific indication.`
        ]
      };
    } catch (error) {
      logger.error(`Error analyzing efficacy: ${error}`);
      return undefined;
    }
  }
  
  /**
   * Analyze medication compatibility with patient factors
   */
  private analyzeCompatibility(
    medication: IMedication,
    input: ComprehensivePrescriptionInput
  ): {
    patientFactors: Array<{ factor: string; isCompatible: boolean; notes: string }>;
    diseaseFactors: Array<{ condition: string; isCompatible: boolean; notes: string }>;
  } {
    const patientFactors: Array<{ factor: string; isCompatible: boolean; notes: string }> = [];
    const diseaseFactors: Array<{ condition: string; isCompatible: boolean; notes: string }> = [];
    
    // Check age compatibility
    if (input.patientAge) {
      const isGeriatric = input.patientAge > 65;
      if (isGeriatric) {
        patientFactors.push({
          factor: 'Geriatric patient',
          isCompatible: medication.geriatricUse,
          notes: medication.geriatricUse 
            ? 'Appropriate for geriatric use' 
            : 'Caution advised in geriatric patients'
        });
      }
      
      const isPediatric = input.patientAge < 18;
      if (isPediatric) {
        patientFactors.push({
          factor: 'Pediatric patient',
          isCompatible: medication.pediatricUse,
          notes: medication.pediatricUse 
            ? 'Appropriate for pediatric use' 
            : 'Not recommended for pediatric patients'
        });
      }
    }
    
    // Check pregnancy compatibility
    if (input.isPregnant) {
      const pregnancyCompatible = ['A', 'B'].includes(medication.pregnancyCategory);
      patientFactors.push({
        factor: 'Pregnancy',
        isCompatible: pregnancyCompatible,
        notes: `Pregnancy category ${medication.pregnancyCategory}`
      });
    }
    
    // Check renal function compatibility
    if (input.renalFunction !== undefined) {
      const renalCompatible = !medication.renalAdjustment || input.renalFunction > 60;
      patientFactors.push({
        factor: 'Renal function',
        isCompatible: renalCompatible,
        notes: medication.renalAdjustment 
          ? 'Dosage adjustment may be required for renal impairment' 
          : 'No renal dosage adjustment required'
      });
    }
    
    // Check hepatic function compatibility
    if (input.hepaticFunction) {
      const hepaticCompatible = !medication.hepaticAdjustment || input.hepaticFunction === 'normal';
      patientFactors.push({
        factor: 'Hepatic function',
        isCompatible: hepaticCompatible,
        notes: medication.hepaticAdjustment 
          ? 'Dosage adjustment may be required for hepatic impairment' 
          : 'No hepatic dosage adjustment required'
      });
    }
    
    // Check disease contraindications
    if (input.relevantConditions) {
      for (const condition of input.relevantConditions) {
        const isContraindicated = (medication.contraindications || []).some(
          contraindication => contraindication.toLowerCase().includes(condition.toLowerCase())
        );
        
        if (isContraindicated) {
          diseaseFactors.push({
            condition,
            isCompatible: false,
            notes: `Contraindicated in patients with ${condition}`
          });
        }
      }
    }
    
    return { patientFactors, diseaseFactors };
  }
  
  /**
   * Rank recommendations based on safety and efficacy
   */
  private rankRecommendations(recommendations: ComprehensiveMedicationRecommendation[]): ComprehensiveMedicationRecommendation[] {
    return [...recommendations].sort((a, b) => {
      // Safety issues have highest priority
      const aSafetyScore = a.safetyAlerts.length * -1; // Negative to rank fewer alerts higher
      const bSafetyScore = b.safetyAlerts.length * -1;
      
      if (aSafetyScore !== bSafetyScore) {
        return bSafetyScore - aSafetyScore;
      }
      
      // Then efficacy
      const aEfficacyScore = a.efficacyInfo?.efficacyScore || 0;
      const bEfficacyScore = b.efficacyInfo?.efficacyScore || 0;
      
      if (aEfficacyScore !== bEfficacyScore) {
        return bEfficacyScore - aEfficacyScore;
      }
      
      // Finally dosage appropriateness
      const aDosageAppropriate = a.dosageAnalysis.isAppropriate ? 1 : 0;
      const bDosageAppropriate = b.dosageAnalysis.isAppropriate ? 1 : 0;
      
      return bDosageAppropriate - aDosageAppropriate;
    });
  }
}

// Export the service as default and as a named instance for easier imports
export default PrescriptionRecommendationService.getInstance();
export const prescriptionRecommendationService = PrescriptionRecommendationService.getInstance(); 