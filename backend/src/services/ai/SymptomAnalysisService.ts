import { BaseAIService } from './BaseAIService';
import { aiConfig } from '../../config/ai.config';
import { OpenAI } from 'openai';
import { SymptomAnalysisInput, SymptomAnalysisOutput, Diagnosis, Treatment } from '../../types/medical';

export class SymptomAnalysisService extends BaseAIService {
    private openai: OpenAI;
    private readonly CONFIDENCE_THRESHOLD = 0.7;

    constructor() {
        super(aiConfig.openai.diagnosisModel);
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async analyzeSymptoms(input: SymptomAnalysisInput): Promise<SymptomAnalysisOutput> {
        try {
            const systemPrompt = this.getSystemPrompt();
            const userPrompt = this.prepareAnalysisPrompt(input);

            const completion = await this.openai.chat.completions.create({
                model: this.config.modelName,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 2000,
                top_p: 0.9,
                frequency_penalty: 0.5,
                presence_penalty: 0.5
            });

            const analysis = this.processAIResponse(completion.choices[0].message.content);
            
            // Validate and enhance analysis with medical knowledge base
            const enhancedAnalysis = await this.enhanceWithMedicalKnowledge(analysis);

            // Log the analysis for future model improvements
            await this.logAnalysis(input, enhancedAnalysis);

            return enhancedAnalysis;

        } catch (error) {
            return this.handleError(error as Error, 'Symptom Analysis');
        }
    }

    private getSystemPrompt(): string {
        return `You are an advanced medical analysis system trained to:
1. Analyze patient symptoms comprehensively
2. Provide detailed differential diagnoses with confidence levels
3. Suggest relevant tests and examinations
4. Recommend potential treatments
5. Highlight red flags and urgent care needs
6. Consider patient history and risk factors

Always maintain medical accuracy and include appropriate disclaimers. Prioritize patient safety and medical best practices.`;
    }

    private prepareAnalysisPrompt(input: SymptomAnalysisInput): string {
        return `
Comprehensive Medical Analysis Request:

Patient Information:
- Age: ${input.age}
- Gender: ${input.gender}
- Primary Symptoms: ${input.primarySymptoms.join(', ')}
- Symptom Duration: ${input.duration}
- Symptom Severity (1-10): ${input.severityLevel}

Vital Signs:
${input.vitalSigns ? `
- Blood Pressure: ${input.vitalSigns.bloodPressure}
- Heart Rate: ${input.vitalSigns.heartRate}
- Temperature: ${input.vitalSigns.temperature}
- Respiratory Rate: ${input.vitalSigns.respiratoryRate}
` : 'Not provided'}

Medical History:
- Existing Conditions: ${input.medicalHistory.conditions.join(', ')}
- Current Medications: ${input.medicalHistory.medications.join(', ')}
- Allergies: ${input.medicalHistory.allergies.join(', ')}

Additional Context:
${input.additionalNotes}

Please provide:
1. Detailed differential diagnoses with confidence levels
2. Recommended diagnostic tests
3. Suggested treatments for each potential diagnosis
4. Red flags requiring immediate attention
5. Lifestyle recommendations
6. Follow-up recommendations
7. Risk factors to consider`;
    }

    private async enhanceWithMedicalKnowledge(analysis: SymptomAnalysisOutput): Promise<SymptomAnalysisOutput> {
        // Enhance analysis with medical databases and latest research
        for (const diagnosis of analysis.diagnoses) {
            // Add treatment guidelines from medical databases
            diagnosis.treatmentGuidelines = await this.fetchTreatmentGuidelines(diagnosis.condition);
            
            // Add relevant research papers
            diagnosis.researchReferences = await this.fetchRelevantResearch(diagnosis.condition);
            
            // Add drug interaction warnings
            diagnosis.drugInteractions = await this.checkDrugInteractions(diagnosis.suggestedMedications);
        }

        return analysis;
    }

    private async fetchTreatmentGuidelines(condition: string): Promise<any> {
        // Implement medical database integration
        // This would connect to medical knowledge bases like UpToDate or DynaMed
        return {};
    }

    private async fetchRelevantResearch(condition: string): Promise<any> {
        // Implement PubMed or similar medical research database integration
        return {};
    }

    private async checkDrugInteractions(medications: string[]): Promise<any> {
        // Implement drug interaction checking using medical databases
        return {};
    }

    private async logAnalysis(input: SymptomAnalysisInput, output: SymptomAnalysisOutput): Promise<void> {
        // Log analysis for audit and improvement purposes
        const sanitizedInput = this.sanitizePatientData(input);
        await this.logPrediction(sanitizedInput, output, {
            modelVersion: this.config.version,
            timestamp: new Date()
        });
    }

    private sanitizePatientData(data: any): any {
        // Implement HIPAA-compliant data sanitization
        return data;
    }
} 