import { BaseAIService } from './BaseAIService';
import { OpenAI } from 'openai';
import { aiConfig } from '../../config/ai.config';
import { DrugInteractionService } from './DrugInteractionService';

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
    private openai: OpenAI;
    private drugInteractionService: DrugInteractionService;

    constructor() {
        super(aiConfig.openai.prescriptionModel);
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.drugInteractionService = new DrugInteractionService();
    }

    async suggestPrescription(input: PrescriptionInput): Promise<PrescriptionSuggestion[]> {
        try {
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

        const completion = await this.openai.chat.completions.create({
            model: this.config.modelName,
            messages: [
                {
                    role: "system",
                    content: "You are a medical prescription assistant with extensive knowledge of pharmacology and medical guidelines. Provide evidence-based prescription suggestions while considering patient safety, drug interactions, and medical history."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.2,
            max_tokens: 2000
        });

        return this.parsePrescriptionResponse(completion.choices[0].message.content);
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
} 