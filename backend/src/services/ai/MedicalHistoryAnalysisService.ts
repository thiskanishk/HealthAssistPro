import { BaseAIService } from './BaseAIService';
import { OpenAI } from 'openai';
import { aiConfig } from '../../config/ai.config';

interface MedicalHistoryAnalysis {
    patientId: string;
    riskFactors: {
        condition: string;
        riskLevel: 'high' | 'medium' | 'low';
        basis: string[];
    }[];
    patterns: {
        description: string;
        relevance: string;
        recommendations: string[];
    }[];
    chronicConditions: {
        condition: string;
        status: string;
        managementSuggestions: string[];
    }[];
    preventiveCare: {
        recommendation: string;
        priority: 'high' | 'medium' | 'low';
        dueDate?: Date;
        reason: string;
    }[];
    medicationHistory: {
        medication: string;
        effectiveness: string;
        sideEffects: string[];
        recommendations: string[];
    }[];
}

export class MedicalHistoryAnalysisService extends BaseAIService {
    private openai: OpenAI;

    constructor() {
        super(aiConfig.openai.medicalHistoryModel);
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async analyzeHistory(patientId: string): Promise<MedicalHistoryAnalysis> {
        try {
            // Fetch patient's complete medical history
            const history = await this.fetchPatientHistory(patientId);

            // Generate AI analysis
            const analysis = await this.generateAnalysis(history);

            // Enhance with medical guidelines
            const enhancedAnalysis = await this.enhanceWithGuidelines(analysis);

            // Log the analysis
            await this.logAnalysis(patientId, enhancedAnalysis);

            return enhancedAnalysis;
        } catch (error) {
            return this.handleError(error as Error, 'Medical History Analysis');
        }
    }

    private async generateAnalysis(history: any): Promise<MedicalHistoryAnalysis> {
        const prompt = this.buildAnalysisPrompt(history);

        const completion = await this.openai.chat.completions.create({
            model: this.config.modelName,
            messages: [
                {
                    role: "system",
                    content: "You are a medical history analysis system. Analyze patient history to identify patterns, risks, and provide evidence-based recommendations."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 2000
        });

        return this.parseAnalysisResponse(completion.choices[0].message.content);
    }

    private buildAnalysisPrompt(history: any): string {
        return `
            Analyze the following medical history:

            Patient Profile:
            ${JSON.stringify(history.profile, null, 2)}

            Medical Conditions:
            ${JSON.stringify(history.conditions, null, 2)}

            Medications:
            ${JSON.stringify(history.medications, null, 2)}

            Procedures:
            ${JSON.stringify(history.procedures, null, 2)}

            Lab Results:
            ${JSON.stringify(history.labResults, null, 2)}

            Please provide:
            1. Risk factor analysis
            2. Pattern identification
            3. Chronic condition management recommendations
            4. Preventive care suggestions
            5. Medication history analysis
        `;
    }

    private async enhanceWithGuidelines(analysis: MedicalHistoryAnalysis): Promise<MedicalHistoryAnalysis> {
        // Enhance analysis with medical guidelines and best practices
        return analysis;
    }

    private async fetchPatientHistory(patientId: string): Promise<any> {
        // Implement fetching patient history from database
        return {};
    }

    private parseAnalysisResponse(response: string): MedicalHistoryAnalysis {
        // Parse and structure the AI response
        return {} as MedicalHistoryAnalysis;
    }

    private async logAnalysis(patientId: string, analysis: MedicalHistoryAnalysis): Promise<void> {
        // Log the analysis for audit and improvement
    }
} 