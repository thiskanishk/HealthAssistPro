import { BaseAIService } from './BaseAIService';
import { aiConfig } from '../../config/ai.config';
import { DrugInteractionService } from './DrugInteractionService';
import { aiService } from './AIServiceManager';
import logger from '../../utils/logger';

interface PrescriptionInput {
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
    };
    labResults?: Record<string, any>;
}

interface PrescriptionSuggestion {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    warnings: string[];
    contraindications: string[];
    sideEffects: string[];
    alternatives: string[];
    interactionRisks: {
        severity: 'high' | 'medium' | 'low';
        description: string;
        medications: string[];
    }[];
}

export class PrescriptionSuggestionService extends BaseAIService {
    private drugInteractionService: DrugInteractionService;

    constructor() {
        super(aiConfig.openai.prescriptionModel);
        this.drugInteractionService = new DrugInteractionService();
    }

    async suggestPrescription(input: PrescriptionInput): Promise<PrescriptionSuggestion[]> {
        try {
            // Validate input
            await this.validateInput(input);

            // Get AI-based prescription suggestions
            const suggestions = await this.getAISuggestions(input);

            // Check drug interactions
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
            return this.handleError(error as Error, 'Prescription Suggestion');
        }
    }

    private async getAISuggestions(input: PrescriptionInput): Promise<PrescriptionSuggestion[]> {
        const prompt = this.buildPrescriptionPrompt(input);
        
        logger.info('Generating prescription suggestions based on diagnosis and patient data');
        
        // Use the aiService instead of direct OpenAI calls
        const response = await aiService.analyzeMedicalReport(prompt);
        
        // Parse the AI response into structured prescription suggestions
        return this.parsePrescriptionResponse(response.analysis || '');
    }

    private buildPrescriptionPrompt(input: PrescriptionInput): string {
        return `
            Generate prescription suggestions based on:

            Diagnosis: ${input.diagnosis}
            Symptoms: ${input.symptoms.join(', ')}

            Patient Profile:
            - Age: ${input.patientData.age}
            - Weight: ${input.patientData.weight}kg
            - Gender: ${input.patientData.gender}
            - Allergies: ${input.patientData.allergies.join(', ')}
            - Current Medications: ${input.patientData.currentMedications.join(', ')}
            - Chronic Conditions: ${input.patientData.chronicConditions.join(', ')}

            Vital Signs:
            - Blood Pressure: ${input.vitalSigns.bloodPressure}
            - Heart Rate: ${input.vitalSigns.heartRate}
            - Temperature: ${input.vitalSigns.temperature}

            ${input.labResults ? `Lab Results: ${JSON.stringify(input.labResults, null, 2)}` : ''}

            Please provide:
            1. Primary medication recommendations with dosage and frequency
            2. Alternative medications
            3. Contraindications and warnings
            4. Potential side effects
            5. Special instructions for administration
            6. Duration of treatment
            7. Follow-up recommendations
        `;
    }

    private parsePrescriptionResponse(response: string): PrescriptionSuggestion[] {
        try {
            const suggestions: PrescriptionSuggestion[] = [];
            const sections = response.split(/\d+\.\s+Primary medication recommendations/i);
            
            if (sections.length < 2) {
                return [this.createDefaultSuggestion("Could not parse response properly")];
            }

            // Process each medication section
            const medicationSections = sections[1].split(/\n\s*\n/).filter(Boolean);
            
            for (const section of medicationSections) {
                if (!section.trim()) continue;
                
                const lines = section.split('\n').map(line => line.trim()).filter(Boolean);
                if (lines.length === 0) continue;
                
                // Extract medication details
                const medicationMatch = lines[0].match(/^(.+?)(?:\s+|:|-)(.+)$/);
                if (!medicationMatch) continue;
                
                const medication = medicationMatch[1].trim();
                const dosageInfo = medicationMatch[2].trim();
                
                // Extract other information
                const dosageMatch = dosageInfo.match(/(\d+\s*\w+)/);
                const frequencyMatch = section.match(/frequency:\s*(.+?)(?:\n|$)/i) || 
                                    section.match(/(\d+\s*times?\s*(?:a|per)\s*day)/i);
                const durationMatch = section.match(/duration:\s*(.+?)(?:\n|$)/i) || 
                                   section.match(/for\s*(.+?)(?:\n|$)/i);
                
                const instructionsMatch = section.match(/instructions:\s*(.+?)(?:\n\n|$)/is) ||
                                       section.match(/special instructions:\s*(.+?)(?:\n\n|$)/is);
                
                const warningsMatch = section.match(/warnings:\s*(.+?)(?:\n\n|$)/is) ||
                                   section.match(/contraindications(?:\s*and\s*warnings)?:\s*(.+?)(?:\n\n|$)/is);
                
                const sideEffectsMatch = section.match(/side effects:\s*(.+?)(?:\n\n|$)/is);
                
                const alternativesMatch = section.match(/alternatives?(?:\s*medications?)?:\s*(.+?)(?:\n\n|$)/is);
                
                // Create suggestion object
                const suggestion: PrescriptionSuggestion = {
                    medication,
                    dosage: dosageMatch ? dosageMatch[1] : dosageInfo,
                    frequency: frequencyMatch ? frequencyMatch[1] : "As directed by physician",
                    duration: durationMatch ? durationMatch[1] : "As directed by physician",
                    instructions: instructionsMatch ? instructionsMatch[1].replace(/\n/g, ' ').trim() : "Take as directed",
                    warnings: warningsMatch 
                        ? warningsMatch[1].split(/\n|;/).map(w => w.trim()).filter(Boolean)
                        : [],
                    contraindications: [],
                    sideEffects: sideEffectsMatch 
                        ? sideEffectsMatch[1].split(/\n|;/).map(s => s.trim()).filter(Boolean)
                        : [],
                    alternatives: alternativesMatch 
                        ? alternativesMatch[1].split(/\n|;|,/).map(a => a.trim()).filter(Boolean)
                        : [],
                    interactionRisks: []
                };
                
                suggestions.push(suggestion);
            }
            
            return suggestions.length > 0 ? suggestions : [this.createDefaultSuggestion()];
        } catch (error) {
            logger.error('Error parsing prescription response', error);
            return [this.createDefaultSuggestion()];
        }
    }

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
            interactionRisks: []
        };
    }

    private async checkInteractions(
        suggestions: PrescriptionSuggestion[],
        currentMedications: string[]
    ): Promise<PrescriptionSuggestion[]> {
        return Promise.all(
            suggestions.map(async (suggestion) => {
                const interactions = await this.drugInteractionService.checkInteractions(
                    suggestion.medication,
                    currentMedications
                );

                return {
                    ...suggestion,
                    interactionRisks: interactions
                };
            })
        );
    }

    private async validateWithGuidelines(
        suggestions: PrescriptionSuggestion[],
        input: PrescriptionInput
    ): Promise<PrescriptionSuggestion[]> {
        // Implement validation against medical guidelines
        return suggestions;
    }

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

        await this.logPrediction(
            sanitizedInput,
            { suggestionsCount: suggestions.length },
            { modelName: this.config.modelName }
        );
    }
} 