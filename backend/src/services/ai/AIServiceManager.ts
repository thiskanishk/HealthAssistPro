import { OpenAI } from 'openai';
import { logger } from '../logger';

export class AIServiceManager {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async generateDiagnosisSuggestion(symptoms: string[], patientHistory: any) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a medical AI assistant helping healthcare professionals. Provide detailed analysis and potential diagnoses based on symptoms and patient history."
                    },
                    {
                        role: "user",
                        content: `Analyze the following symptoms and patient history:
                          Symptoms: ${symptoms.join(', ')}
                          Patient History: ${JSON.stringify(patientHistory, null, 2)}`
                    }
                ],
                temperature: 0.3
            });

            return {
                suggestions: response.choices[0].message.content,
                confidence: response.choices[0].finish_reason === 'stop' ? 'high' : 'medium'
            };
        } catch (error) {
            logger.error('AI Diagnosis Generation Error:', error);
            throw error;
        }
    }

    async analyzeMedicalReport(reportText: string) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a medical report analyzer. Extract key findings, recommendations, and potential concerns from medical reports."
                    },
                    {
                        role: "user",
                        content: reportText
                    }
                ],
                temperature: 0.2
            });

            return {
                analysis: response.choices[0].message.content,
                keyFindings: this.extractKeyFindings(response.choices[0].message.content)
            };
        } catch (error) {
            logger.error('Medical Report Analysis Error:', error);
            throw error;
        }
    }

    private extractKeyFindings(analysis: string) {
        // Implementation to extract structured key findings
        return analysis.split('\n').filter(line => line.includes(':'));
    }
}

export const aiService = new AIServiceManager(); 