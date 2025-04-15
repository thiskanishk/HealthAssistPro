import { BaseAIService } from './BaseAIService';
import { aiConfig } from '../../config/ai.config';
import { DrugInteractionService } from './DrugInteractionService';
import { aiService } from './AIServiceManager';
import logger from '../../utils/logger';
import { medicationRepository, Medication, TreatmentGuideline } from '../../repositories/MedicationRepository';

// Define specific error types for better error handling
export class PrescriptionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrescriptionValidationError';
  }
}

export class PrescriptionParsingError extends Error {
  constructor(message: string, public rawResponse?: string) {
    super(message);
    this.name = 'PrescriptionParsingError';
  }
}

export class DrugInteractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DrugInteractionError';
  }
}

// Enums for better type safety
export enum InteractionSeverity {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum PrescriptionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REQUIRES_REVIEW = 'requires_review'
}

// More specific lab result type
export interface LabResult {
  name: string;
  value: number | string;
  unit: string;
  referenceRange?: {
    min?: number;
    max?: number;
    text?: string;
  };
  isAbnormal?: boolean;
}

export interface PrescriptionInput {
  diagnosis: string;
  symptoms: string[];
  patientData: {
    age: number;
    weight: number;
    gender: string;
    allergies: string[];
    currentMedications: string[];
    chronicConditions: string[];
  };
  vitalSigns: {
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  };
  labResults?: LabResult[];
}

export interface DrugInteractionRisk {
  severity: InteractionSeverity;
  description: string;
  medications: string[];
  evidenceLevel?: 'strong' | 'moderate' | 'weak';
  reference?: string;
}

export interface PrescriptionSuggestion {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  warnings: string[];
  contraindications: string[];
  sideEffects: string[];
  alternatives: string[];
  interactionRisks: DrugInteractionRisk[];
  status?: PrescriptionStatus;
}

export class PrescriptionSuggestionService extends BaseAIService {
  private drugInteractionService: DrugInteractionService;
  private readonly MAX_RETRIES = 2;
  private cachedGuidelines: Map<string, TreatmentGuideline> = new Map();

  constructor() {
    super(aiConfig.openai.prescriptionModel);
    // Get the singleton instance of DrugInteractionService
    this.drugInteractionService = DrugInteractionService.getInstance();
  }

  /**
   * Generate medication prescription suggestions based on patient data and diagnosis
   * @param input Patient diagnosis and medical data
   * @returns Array of prescription suggestions with potential interactions
   * @throws PrescriptionValidationError if input data is invalid
   * @throws PrescriptionParsingError if AI response cannot be parsed
   * @throws DrugInteractionError if drug interaction check fails
   */
  async suggestPrescription(input: PrescriptionInput): Promise<PrescriptionSuggestion[]> {
    try {
      // Validate input
      this.validatePrescriptionInput(input);
      
      // Ensure medication repository is initialized
      await this.ensureMedicationRepositoryInitialized();

      // Get AI-based prescription suggestions
      const suggestions = await this.getAISuggestions(input);

      // Check drug interactions using the centralized repository
      const enhancedSuggestions = await this.checkInteractions(
        suggestions,
        input.patientData.currentMedications
      );

      // Validate against medical guidelines
      const validatedSuggestions = await this.validateWithGuidelines(
        enhancedSuggestions,
        input
      );

      // Log the prescription suggestions
      await this.logPrescriptionSuggestions(input, validatedSuggestions);

      return validatedSuggestions;
    } catch (error) {
      if (error instanceof PrescriptionValidationError ||
          error instanceof PrescriptionParsingError ||
          error instanceof DrugInteractionError) {
        // Re-throw known errors
        throw error;
      }
      // Convert unknown errors to specific types
      return this.handleError(error as Error, 'Prescription Suggestion');
    }
  }

  /**
   * Ensure the medication repository is initialized before using it
   */
  private async ensureMedicationRepositoryInitialized(): Promise<void> {
    try {
      // This will initialize the repository if it hasn't been already
      await medicationRepository.initialize();
    } catch (error) {
      logger.error('Failed to initialize medication repository', error);
      throw new Error('Could not access medication data');
    }
  }

  /**
   * Validate that prescription input contains all required data and is properly formatted
   * @throws PrescriptionValidationError for invalid input
   */
  private validatePrescriptionInput(input: PrescriptionInput): void {
    // Check for required fields
    if (!input.diagnosis || !input.diagnosis.trim()) {
      throw new PrescriptionValidationError('Diagnosis is required');
    }

    if (!input.symptoms || !Array.isArray(input.symptoms) || input.symptoms.length === 0) {
      throw new PrescriptionValidationError('At least one symptom is required');
    }

    // Validate patient data
    if (!input.patientData) {
      throw new PrescriptionValidationError('Patient data is required');
    }

    const { age, weight, gender } = input.patientData;
    
    if (typeof age !== 'number' || age <= 0 || age > 120) {
      throw new PrescriptionValidationError('Valid patient age is required (1-120)');
    }
    
    if (typeof weight !== 'number' || weight <= 0 || weight > 500) {
      throw new PrescriptionValidationError('Valid patient weight is required (1-500kg)');
    }
    
    if (!gender || !['male', 'female', 'other', 'unknown'].includes(gender.toLowerCase())) {
      throw new PrescriptionValidationError('Valid patient gender is required');
    }

    // Validate vital signs
    if (!input.vitalSigns) {
      throw new PrescriptionValidationError('Vital signs are required');
    }

    const { bloodPressure, heartRate, temperature } = input.vitalSigns;
    
    if (!bloodPressure || !bloodPressure.includes('/')) {
      throw new PrescriptionValidationError('Valid blood pressure is required (e.g., 120/80)');
    }
    
    if (typeof heartRate !== 'number' || heartRate < 30 || heartRate > 220) {
      throw new PrescriptionValidationError('Valid heart rate is required (30-220 bpm)');
    }
    
    if (typeof temperature !== 'number' || temperature < 34 || temperature > 42) {
      throw new PrescriptionValidationError('Valid temperature is required (34-42°C)');
    }

    logger.info('Prescription input validation successful');
  }

  /**
   * Get AI-generated prescription suggestions using the medical LLM
   * Includes retry logic for transient failures
   */
  private async getAISuggestions(input: PrescriptionInput): Promise<PrescriptionSuggestion[]> {
    const prompt = this.buildPrescriptionPrompt(input);
    
    logger.info('Generating prescription suggestions based on diagnosis and patient data');
    
    let attempts = 0;
    let lastError: Error | null = null;
    
    // Implement retry logic for AI service calls
    while (attempts <= this.MAX_RETRIES) {
      try {
        // Use the aiService instead of direct OpenAI calls
        const response = await aiService.analyzeMedicalReport(prompt);
        
        if (!response || !response.analysis) {
          throw new PrescriptionParsingError('Empty response from AI service');
        }
        
        // Parse the AI response into structured prescription suggestions
        return this.parsePrescriptionResponse(response.analysis);
      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        // If we have more retries, wait a bit before trying again
        if (attempts <= this.MAX_RETRIES) {
          const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
          logger.warn(`AI service attempt ${attempts} failed, retrying in ${delay}ms`, { error: lastError });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we reach here, all attempts failed
    logger.error('All AI service attempts failed', { error: lastError });
    throw new PrescriptionParsingError(`Failed to get AI suggestions after ${this.MAX_RETRIES + 1} attempts: ${lastError?.message}`);
  }

  /**
   * Build a prompt for the AI service with all relevant patient information
   */
  private buildPrescriptionPrompt(input: PrescriptionInput): string {
    // Sanitize inputs to prevent prompt injection
    const sanitizedDiagnosis = this.sanitizeInput(input.diagnosis);
    const sanitizedSymptoms = input.symptoms.map(s => this.sanitizeInput(s));
    
    return `
        Generate prescription suggestions based on:

        Diagnosis: ${sanitizedDiagnosis}
        Symptoms: ${sanitizedSymptoms.join(', ')}

        Patient Profile:
        - Age: ${input.patientData.age}
        - Weight: ${input.patientData.weight}kg
        - Gender: ${input.patientData.gender}
        - Allergies: ${input.patientData.allergies.map(a => this.sanitizeInput(a)).join(', ') || 'None reported'}
        - Current Medications: ${input.patientData.currentMedications.map(m => this.sanitizeInput(m)).join(', ') || 'None'}
        - Chronic Conditions: ${input.patientData.chronicConditions.map(c => this.sanitizeInput(c)).join(', ') || 'None reported'}

        Vital Signs:
        - Blood Pressure: ${input.vitalSigns.bloodPressure}
        - Heart Rate: ${input.vitalSigns.heartRate} bpm
        - Temperature: ${input.vitalSigns.temperature}°C
        ${input.vitalSigns.respiratoryRate ? `- Respiratory Rate: ${input.vitalSigns.respiratoryRate} breaths/min` : ''}
        ${input.vitalSigns.oxygenSaturation ? `- Oxygen Saturation: ${input.vitalSigns.oxygenSaturation}%` : ''}

        ${input.labResults && input.labResults.length > 0 ? 'Lab Results:\n' + input.labResults.map(lab => 
          `- ${lab.name}: ${lab.value} ${lab.unit}${lab.isAbnormal ? ' (Abnormal)' : ''}`
        ).join('\n') : ''}

        Please provide:
        1. Primary medication recommendations with dosage and frequency
        2. Alternative medications
        3. Contraindications and warnings
        4. Potential side effects
        5. Special instructions for administration
        6. Duration of treatment
        7. Follow-up recommendations

        Format each medication recommendation clearly with specific dosage, frequency, and duration.
    `;
  }

  /**
   * Sanitize input to prevent prompt injection attacks
   */
  private sanitizeInput(input: string): string {
    // Remove special characters that could interfere with the prompt structure
    return input
      .replace(/[\\{}]/g, '')
      .replace(/`/g, '')
      .replace(/\n/g, ' ')
      .trim();
  }

  /**
   * Parse AI-generated text into structured prescription suggestions
   * Uses a robust parsing approach with fallbacks for different response formats
   */
  private parsePrescriptionResponse(response: string): PrescriptionSuggestion[] {
    try {
      const suggestions: PrescriptionSuggestion[] = [];
      
      // First try to find medication sections in the response
      let medicationSections: string[] = [];
      
      // Try different parsing strategies
      const primaryRxPattern = /\d+\.\s*Primary medication recommendations/i;
      const medicationPattern = /\b(medication|drug|rx|prescribe|recommend)\b.*?:/i;
      
      if (primaryRxPattern.test(response)) {
        // If the response follows our expected format
        const sections = response.split(primaryRxPattern);
        if (sections.length >= 2) {
          medicationSections = sections[1]
            .split(/\n\s*\n|\n\d+\.\s+/g)
            .filter(Boolean)
            .map(s => s.trim());
        }
      } else {
        // Try alternative parsing approach for unexpected formats
        medicationSections = response
          .split(/\n\s*\n/)
          .filter(section => medicationPattern.test(section));
      }
      
      if (medicationSections.length === 0) {
        logger.warn('Could not identify medication sections in AI response', { sampleResponse: response.substring(0, 200) });
        return [this.createDefaultSuggestion("Could not parse response properly")];
      }

      // Process each medication section
      for (const section of medicationSections) {
        if (!section.trim()) continue;
        
        const lines = section.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.length === 0) continue;
        
        // Try multiple patterns to extract medication name and dosage
        const medicationData = this.extractMedicationData(lines);
        if (!medicationData) continue;
        
        const { medication, dosageInfo } = medicationData;
        
        // Create suggestion with extracted information
        const suggestion = this.extractMedicationDetails(section, medication, dosageInfo);
        suggestions.push(suggestion);
      }
      
      return suggestions.length > 0 ? suggestions : [this.createDefaultSuggestion()];
    } catch (error) {
      logger.error('Error parsing prescription response', error);
      throw new PrescriptionParsingError('Failed to parse prescription suggestions', response);
    }
  }

  /**
   * Extract medication name and dosage information from text lines
   */
  private extractMedicationData(lines: string[]): { medication: string; dosageInfo: string } | null {
    // Try several patterns to extract medication name and dosage
    for (const line of lines) {
      // Pattern 1: Medication name: dosage
      const pattern1 = line.match(/^(.+?)(?:\s*:\s*)(.+)$/);
      if (pattern1) {
        return { medication: pattern1[1].trim(), dosageInfo: pattern1[2].trim() };
      }
      
      // Pattern 2: Medication name - dosage
      const pattern2 = line.match(/^(.+?)(?:\s*-\s*)(.+)$/);
      if (pattern2) {
        return { medication: pattern2[1].trim(), dosageInfo: pattern2[2].trim() };
      }
      
      // Pattern 3: Medication (dosage)
      const pattern3 = line.match(/^(.+?)\s*\(([^)]+)\)/);
      if (pattern3) {
        return { medication: pattern3[1].trim(), dosageInfo: pattern3[2].trim() };
      }
    }
    
    // If we couldn't match the patterns, try to at least extract a medication name
    const medicationNamePattern = /^([A-Za-z\s]+(?:\s+\d+\s*mg)?)/;
    const match = lines[0].match(medicationNamePattern);
    
    if (match) {
      return { medication: match[1].trim(), dosageInfo: lines[0].replace(match[1], '').trim() };
    }
    
    return null;
  }

  /**
   * Extract detailed information about a medication from a text section
   */
  private extractMedicationDetails(section: string, medication: string, dosageInfo: string): PrescriptionSuggestion {
    // Extract dosage
    const dosageMatch = dosageInfo.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|IU|tablet|capsule|pill|patch|drop)s?)/i);
    const dosage = dosageMatch ? dosageMatch[1] : dosageInfo;
    
    // Extract frequency using multiple patterns
    const frequencyPatterns = [
      /frequency:\s*(.+?)(?:\n|$)/i,
      /(\d+\s*times?\s*(?:a|per)\s*day)/i,
      /\b(once|twice|three times|four times)\s+(?:a|per)\s+day\b/i,
      /\bevery\s+(\d+\s*hours?)\b/i,
      /\b(daily|weekly|monthly|twice daily|twice a week)\b/i
    ];
    
    let frequency = "As directed by physician";
    for (const pattern of frequencyPatterns) {
      const match = section.match(pattern);
      if (match) {
        frequency = match[1].trim();
        break;
      }
    }
    
    // Extract duration using multiple patterns
    const durationPatterns = [
      /duration:\s*(.+?)(?:\n|$)/i,
      /for\s+(\d+\s*(?:days?|weeks?|months?))/i,
      /(?:continue|take)\s+for\s+(\d+\s*(?:days?|weeks?|months?))/i
    ];
    
    let duration = "As directed by physician";
    for (const pattern of durationPatterns) {
      const match = section.match(pattern);
      if (match) {
        duration = match[1].trim();
        break;
      }
    }
    
    // Extract instructions
    const instructionsPatterns = [
      /instructions?:\s*(.+?)(?:\n\n|$)/is,
      /special instructions?:\s*(.+?)(?:\n\n|$)/is,
      /(?:take|administer)(?:[^.]+)(?:\.|$)/i
    ];
    
    let instructions = "Take as directed";
    for (const pattern of instructionsPatterns) {
      const match = section.match(pattern);
      if (match) {
        instructions = match[1] ? match[1].replace(/\n/g, ' ').trim() : match[0].trim();
        break;
      }
    }
    
    // Extract warnings and contraindications
    const warningsPatterns = [
      /warnings?:\s*(.+?)(?:\n\n|$)/is,
      /contraindications?:\s*(.+?)(?:\n\n|$)/is
    ];
    
    let warnings: string[] = [];
    for (const pattern of warningsPatterns) {
      const match = section.match(pattern);
      if (match && match[1]) {
        warnings = match[1]
          .split(/\n|-|;|•/)
          .map(w => w.trim())
          .filter(Boolean);
        break;
      }
    }
    
    // Extract contraindications
    const contraindicationsPatterns = [
      /contraindications?(?:\s*and\s*warnings?)?:\s*(.+?)(?:\n\n|$)/is
    ];
    
    let contraindications: string[] = [];
    for (const pattern of contraindicationsPatterns) {
      const match = section.match(pattern);
      if (match && match[1]) {
        contraindications = match[1]
          .split(/\n|-|;|•/)
          .map(c => c.trim())
          .filter(Boolean);
        break;
      }
    }
    
    // Extract side effects
    const sideEffectsPatterns = [
      /side effects?:\s*(.+?)(?:\n\n|$)/is,
      /adverse effects?:\s*(.+?)(?:\n\n|$)/is
    ];
    
    let sideEffects: string[] = [];
    for (const pattern of sideEffectsPatterns) {
      const match = section.match(pattern);
      if (match && match[1]) {
        sideEffects = match[1]
          .split(/\n|-|;|•/)
          .map(s => s.trim())
          .filter(Boolean);
        break;
      }
    }
    
    // Extract alternatives
    const alternativesPatterns = [
      /alternatives?(?:\s*medications?)?:\s*(.+?)(?:\n\n|$)/is,
      /alternative medications?:\s*(.+?)(?:\n\n|$)/is
    ];
    
    let alternatives: string[] = [];
    for (const pattern of alternativesPatterns) {
      const match = section.match(pattern);
      if (match && match[1]) {
        alternatives = match[1]
          .split(/\n|-|;|,|•/)
          .map(a => a.trim())
          .filter(Boolean);
        break;
      }
    }
    
    return {
      medication,
      dosage,
      frequency,
      duration,
      instructions,
      warnings,
      contraindications,
      sideEffects,
      alternatives,
      interactionRisks: [],
      status: PrescriptionStatus.PENDING
    };
  }

  /**
   * Create a default suggestion when parsing fails
   */
  private createDefaultSuggestion(note = "Failed to generate suggestions"): PrescriptionSuggestion {
    return {
      medication: "Consult healthcare provider",
      dosage: "N/A",
      frequency: "N/A",
      duration: "N/A",
      instructions: note,
      warnings: ["Automated suggestion failed, consult healthcare provider"],
      contraindications: [],
      sideEffects: [],
      alternatives: [],
      interactionRisks: [],
      status: PrescriptionStatus.REQUIRES_REVIEW
    };
  }

  /**
   * Check for drug interactions between suggested medications and current medications
   * Uses the medication repository for comprehensive interaction checking
   */
  private async checkInteractions(
    suggestions: PrescriptionSuggestion[],
    currentMedications: string[]
  ): Promise<PrescriptionSuggestion[]> {
    logger.info('Checking drug interactions for prescription suggestions');
    
    const enhancedSuggestions: PrescriptionSuggestion[] = [];
    
    for (const suggestion of suggestions) {
      try {
        // First check interactions with existing medications using the repository
        const repoInteractions = await medicationRepository.checkInteractions(
          suggestion.medication,
          currentMedications
        );
        
        // Then check interactions with DrugInteractionService as a backup/supplement
        const serviceInteractions = await this.drugInteractionService.checkInteractions(
          suggestion.medication,
          currentMedications
        );
        
        // Combine and deduplicate interactions
        const allInteractionRisks: DrugInteractionRisk[] = [];
        
        // Process repository interactions
        for (const interaction of repoInteractions) {
          allInteractionRisks.push({
            severity: this.mapSeverity(interaction.severity),
            description: interaction.description,
            medications: [interaction.medication],
            evidenceLevel: interaction.evidenceLevel as 'strong' | 'moderate' | 'weak',
          });
        }
        
        // Process service interactions
        for (const risk of serviceInteractions) {
          // Check if we already have this interaction from the repository
          const existingIndex = allInteractionRisks.findIndex(
            ir => ir.medications.includes(risk.medications[0]) && ir.severity === risk.severity
          );
          
          if (existingIndex >= 0) {
            // Merge descriptions if they're different
            if (!allInteractionRisks[existingIndex].description.includes(risk.description)) {
              allInteractionRisks[existingIndex].description += '; ' + risk.description;
            }
          } else {
            allInteractionRisks.push(risk);
          }
        }
        
        // Update the suggestion with interaction risks
        const updatedSuggestion: PrescriptionSuggestion = {
          ...suggestion,
          interactionRisks: allInteractionRisks
        };
        
        // Flag if there are any high severity interactions
        if (allInteractionRisks.some(risk => risk.severity === InteractionSeverity.HIGH)) {
          updatedSuggestion.status = PrescriptionStatus.REQUIRES_REVIEW;
          updatedSuggestion.warnings = [
            ...updatedSuggestion.warnings,
            'High-risk drug interaction detected - medical review required'
          ];
        }
        
        enhancedSuggestions.push(updatedSuggestion);
      } catch (error) {
        logger.error(`Error checking interactions for ${suggestion.medication}`, error);
        // Add a warning to the suggestion
        suggestion.warnings.push('Could not fully verify drug interactions - use with caution');
        suggestion.status = PrescriptionStatus.REQUIRES_REVIEW;
        enhancedSuggestions.push(suggestion);
      }
    }
    
    return enhancedSuggestions;
  }

  /**
   * Map interaction severity from repository format to service format
   */
  private mapSeverity(severity: string): InteractionSeverity {
    switch (severity.toLowerCase()) {
      case 'high':
        return InteractionSeverity.HIGH;
      case 'moderate':
        return InteractionSeverity.MEDIUM;
      case 'low':
        return InteractionSeverity.LOW;
      default:
        return InteractionSeverity.MEDIUM;
    }
  }

  /**
   * Validate suggestions against medical guidelines using the medication repository
   */
  private async validateWithGuidelines(
    suggestions: PrescriptionSuggestion[],
    input: PrescriptionInput
  ): Promise<PrescriptionSuggestion[]> {
    logger.info('Validating prescription suggestions against medical guidelines');
    
    const validatedSuggestions: PrescriptionSuggestion[] = [];
    
    // Get guidelines for the diagnosis if available
    const guideline = await this.getGuidelinesForDiagnosis(input.diagnosis);
    
    for (const suggestion of suggestions) {
      const validatedSuggestion = { ...suggestion };
      const validationWarnings: string[] = [];
      
      // Check pregnancy status if applicable
      if (input.patientData.gender.toLowerCase() === 'female' && input.patientData.age >= 12 && input.patientData.age <= 50) {
        const pregnancyCategory = await medicationRepository.checkPregnancyCategory(suggestion.medication);
        if (pregnancyCategory && ['D', 'X'].includes(pregnancyCategory)) {
          validationWarnings.push(`Pregnancy category ${pregnancyCategory} - potentially harmful to fetus`);
          validatedSuggestion.status = PrescriptionStatus.REQUIRES_REVIEW;
        }
      }
      
      // Check Beers criteria for elderly patients
      if (input.patientData.age > 65) {
        const beersCriteria = await medicationRepository.checkBeersCriteria(suggestion.medication);
        if (beersCriteria && beersCriteria.isInappropriate) {
          validationWarnings.push(`Potentially inappropriate for elderly patients: ${beersCriteria.reason || 'See Beers Criteria'}`);
          if (beersCriteria.recommendation) {
            validationWarnings.push(`Recommendation: ${beersCriteria.recommendation}`);
          }
          validatedSuggestion.status = PrescriptionStatus.REQUIRES_REVIEW;
        }
      }
      
      // Check pediatric safety for children
      if (input.patientData.age < 18) {
        const medication = await medicationRepository.getMedicationByName(suggestion.medication);
        if (medication?.pediatricUse) {
          if (!medication.pediatricUse.isSafe) {
            validationWarnings.push(`Not recommended for pediatric use`);
            validatedSuggestion.status = PrescriptionStatus.REQUIRES_REVIEW;
          } else if (medication.pediatricUse.minimumAge && input.patientData.age < medication.pediatricUse.minimumAge) {
            validationWarnings.push(`Not recommended for children under ${medication.pediatricUse.minimumAge} years`);
            validatedSuggestion.status = PrescriptionStatus.REQUIRES_REVIEW;
          }
          
          if (medication.pediatricUse.warnings && medication.pediatricUse.warnings.length > 0) {
            validationWarnings.push(...medication.pediatricUse.warnings);
          }
          
          if (medication.pediatricUse.dosageAdjustment) {
            validationWarnings.push(`Pediatric dosage adjustment required: ${medication.pediatricUse.dosageAdjustment}`);
          }
        }
      }
      
      // Check if medication is a first-line treatment for the condition
      if (guideline) {
        const isFirstLine = guideline.firstLineOptions.some(option => 
          option.medications.some(med => med.toLowerCase() === suggestion.medication.toLowerCase())
        );
        
        const isSecondLine = guideline.secondLineOptions.some(option => 
          option.medications.some(med => med.toLowerCase() === suggestion.medication.toLowerCase())
        );
        
        if (!isFirstLine && !isSecondLine) {
          validationWarnings.push(`Not a standard treatment option for ${input.diagnosis} according to guidelines`);
          validatedSuggestion.status = PrescriptionStatus.REQUIRES_REVIEW;
        } else if (isSecondLine && !isFirstLine) {
          validationWarnings.push(`Second-line treatment option for ${input.diagnosis}`);
        }
        
        // Check for special population recommendations
        const populationTypes: Array<'pediatric' | 'geriatric' | 'pregnant' | 'renalImpairment' | 'hepaticImpairment'> = [];
        
        // Add applicable populations
        if (input.patientData.age < 18) populationTypes.push('pediatric');
        if (input.patientData.age > 65) populationTypes.push('geriatric');
        
        for (const populationType of populationTypes) {
          const specialPopulation = guideline.specialPopulations.find(pop => pop.population === populationType);
          if (specialPopulation) {
            // Check if this medication is in the special population recommendations
            const isMedicationRecommended = specialPopulation.medications.some(
              med => med.toLowerCase().includes(suggestion.medication.toLowerCase()) ||
                     suggestion.medication.toLowerCase().includes(med.toLowerCase())
            );
            
            if (!isMedicationRecommended) {
              validationWarnings.push(`Not recommended for ${populationType} patients with ${input.diagnosis}`);
              validationWarnings.push(...specialPopulation.recommendations);
              validatedSuggestion.status = PrescriptionStatus.REQUIRES_REVIEW;
            }
          }
        }
      }
      
      // Check dosage guidelines
      const dosageGuidelines = await medicationRepository.getDosageGuidelines(
        suggestion.medication,
        input.patientData.age,
        input.patientData.weight,
        input.diagnosis
      );
      
      if (dosageGuidelines && dosageGuidelines.length > 0) {
        // Find the best match from available guidelines
        let matched = false;
        
        for (const guideline of dosageGuidelines) {
          // Extract numeric dosage for comparison if possible
          const suggestedDosage = this.extractNumericDosage(suggestion.dosage);
          const guidelineDosage = this.extractNumericDosage(guideline.dosage);
          
          if (suggestedDosage && guidelineDosage) {
            // Check if dosage is within a reasonable range (±20%)
            const minAcceptable = guidelineDosage * 0.8;
            const maxAcceptable = guidelineDosage * 1.2;
            
            if (suggestedDosage < minAcceptable || suggestedDosage > maxAcceptable) {
              validationWarnings.push(`Dosage differs from guideline recommendation (${guideline.dosage})`);
              matched = true;
              break;
            }
          }
          
          // Check max daily dose if available
          if (guideline.maxDailyDose) {
            const maxDaily = this.extractNumericDosage(guideline.maxDailyDose);
            const suggestedDaily = this.calculateDailyDosage(suggestion.dosage, suggestion.frequency);
            
            if (maxDaily && suggestedDaily && suggestedDaily > maxDaily) {
              validationWarnings.push(`Exceeds maximum recommended daily dose of ${guideline.maxDailyDose}`);
              validatedSuggestion.status = PrescriptionStatus.REQUIRES_REVIEW;
            }
          }
          
          // Add any notes from the guideline
          if (guideline.notes) {
            validationWarnings.push(`Note: ${guideline.notes}`);
          }
          
          matched = true;
        }
        
        if (!matched) {
          validationWarnings.push('Could not verify dosage against guidelines - use clinical judgment');
        }
      }
      
      // Add all validation warnings to the suggestion
      validatedSuggestion.warnings = [...validatedSuggestion.warnings, ...validationWarnings];
      validatedSuggestions.push(validatedSuggestion);
    }
    
    return validatedSuggestions;
  }

  /**
   * Get treatment guidelines for a diagnosis
   */
  private async getGuidelinesForDiagnosis(diagnosis: string): Promise<TreatmentGuideline | null> {
    // Check cache first
    if (this.cachedGuidelines.has(diagnosis)) {
      return this.cachedGuidelines.get(diagnosis) || null;
    }
    
    // Try to get from repository
    const guideline = await medicationRepository.getGuidelinesForCondition(diagnosis);
    
    // Cache the result (even if null to avoid repeated lookups)
    this.cachedGuidelines.set(diagnosis, guideline as TreatmentGuideline);
    
    return guideline;
  }

  /**
   * Extract numeric dosage from a dosage string
   * e.g. "10 mg" -> 10, "10-20 mg" -> 15 (average)
   */
  private extractNumericDosage(dosageString: string): number | null {
    try {
      // Handle range format (e.g., "10-20 mg")
      if (dosageString.includes('-')) {
        const [min, max] = dosageString.split('-');
        const minNum = parseFloat(min.replace(/[^\d.]/g, ''));
        const maxNum = parseFloat(max.replace(/[^\d.]/g, ''));
        return (minNum + maxNum) / 2; // Return average
      }
      
      // Handle simple format (e.g., "10 mg")
      const match = dosageString.match(/(\d+(\.\d+)?)/);
      if (match) {
        return parseFloat(match[0]);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate approximate daily dosage based on individual dose and frequency
   */
  private calculateDailyDosage(dosage: string, frequency: string): number | null {
    const numericDosage = this.extractNumericDosage(dosage);
    if (!numericDosage) return null;
    
    let timesPerDay = 1;
    const lowerFreq = frequency.toLowerCase();
    
    if (lowerFreq.includes('twice') || lowerFreq.includes('two times') || lowerFreq.includes('bid') || lowerFreq.includes('b.i.d')) {
      timesPerDay = 2;
    } else if (lowerFreq.includes('three times') || lowerFreq.includes('tid') || lowerFreq.includes('t.i.d')) {
      timesPerDay = 3;
    } else if (lowerFreq.includes('four times') || lowerFreq.includes('qid') || lowerFreq.includes('q.i.d')) {
      timesPerDay = 4;
    } else if (lowerFreq.includes('every 12 hours')) {
      timesPerDay = 2;
    } else if (lowerFreq.includes('every 8 hours')) {
      timesPerDay = 3;
    } else if (lowerFreq.includes('every 6 hours')) {
      timesPerDay = 4;
    } else if (lowerFreq.includes('every 4 hours')) {
      timesPerDay = 6;
    }
    
    return numericDosage * timesPerDay;
  }

  /**
   * Log prescription suggestions for monitoring and audit
   */
  private async logPrescriptionSuggestions(
    input: PrescriptionInput,
    suggestions: PrescriptionSuggestion[]
  ): Promise<void> {
    // Sanitize patient data before logging
    const sanitizedInput = {
      diagnosis: input.diagnosis,
      symptoms: input.symptoms,
      patientData: {
        age: input.patientData.age,
        gender: input.patientData.gender,
        hasAllergies: input.patientData.allergies.length > 0,
        hasChronicConditions: input.patientData.chronicConditions.length > 0,
        medicationsCount: input.patientData.currentMedications.length
      }
    };

    const suggestionsInfo = suggestions.map(s => ({
      medication: s.medication,
      hasInteractions: s.interactionRisks.length > 0,
      highRiskInteractions: s.interactionRisks.filter(i => i.severity === InteractionSeverity.HIGH).length,
      status: s.status
    }));

    await this.logPrediction(
      sanitizedInput,
      { suggestions: suggestionsInfo },
      { modelName: this.config.modelName }
    );
  }

  /**
   * Handle error by converting to an appropriate error type
   */
  protected handleError(error: Error, context: string): never {
    const errorMessage = `Error in ${context}: ${error.message}`;
    logger.error(errorMessage, { error });
    
    if (error.message.includes('validation') || error.message.includes('required')) {
      throw new PrescriptionValidationError(errorMessage);
    } else if (error.message.includes('parsing') || error.message.includes('response')) {
      throw new PrescriptionParsingError(errorMessage);
    } else if (error.message.includes('interaction')) {
      throw new DrugInteractionError(errorMessage);
    }
    
    throw new Error(errorMessage);
  }
}

// Export singleton instance
export const prescriptionService = new PrescriptionSuggestionService(); 