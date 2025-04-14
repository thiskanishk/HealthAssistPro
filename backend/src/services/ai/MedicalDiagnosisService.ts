import { BaseAIService } from './BaseAIService';
import { aiConfig } from '../../config/ai.config';
import { OpenAI } from 'openai';
import { DiagnosisInput, DiagnosisOutput } from '../../types/diagnosis';
import { validateDiagnosisInput } from '../../validators/diagnosisValidator';

export class MedicalDiagnosisService extends BaseAIService {
    private openai: OpenAI;

    constructor() {
        super(aiConfig.openai.diagnosisModel);
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async analyzeSymptomsAndDiagnose(input: DiagnosisInput): Promise<DiagnosisOutput> {
        try {
            // Validate input
            await validateDiagnosisInput(input);

            // Prepare prompt
            const prompt = this.prepareDiagnosisPrompt(input);

            // Get AI prediction
            const completion = await this.openai.chat.completions.create({
                model: this.config.modelName,
                messages: [
                    {
                        role: "system",
                        content: "You are a medical diagnosis assistant. Provide detailed analysis based on symptoms while maintaining a professional and cautious approach. Always include disclaimers and recommend professional medical consultation."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
                timeout: this.config.timeout
            });

            // Process and validate response
            const diagnosis = this.processAIResponse(completion);

            // Log prediction (with sanitized data)
            await this.logPrediction(input, diagnosis, {
                modelVersion: this.config.version,
                timestamp: new Date()
            });

            return diagnosis;

        } catch (error) {
            return this.handleError(error as Error, 'Medical Diagnosis Analysis');
        }
    }

    private prepareDiagnosisPrompt(input: DiagnosisInput): string {
        return `
            Patient Symptoms Analysis Request:
            
            Primary Symptoms: ${input.primarySymptoms.join(', ')}
            Duration: ${input.duration}
            Severity: ${input.severity}
            Additional Information: ${input.additionalInfo}
            
            Previous Medical History: ${input.medicalHistory}
            Current Medications: ${input.currentMedications.join(', ')}
            
            Please provide:
            1. Potential diagnoses with confidence levels
            2. Recommended next steps
            3. Warning signs to watch for
            4. Lifestyle recommendations
            5. Whether immediate medical attention is needed
        `;
    }

    private processAIResponse(completion: any): DiagnosisOutput {
        const response = completion.choices[0].message.content;
        
        // Process and structure the response
        // Add validation and safety checks
        // Ensure medical disclaimers are included
        
        return {
            possibleDiagnoses: [],  // Parse from response
            confidenceLevels: [],   // Parse from response
            recommendations: [],     // Parse from response
            warningSignals: [],     // Parse from response
            requiresImmediate: false, // Determine based on response
            disclaimer: "This is an AI-assisted analysis and should not replace professional medical advice. Please consult with a healthcare provider for accurate diagnosis and treatment.",
            timestamp: new Date(),
            modelVersion: this.config.version
        };
    }
} 