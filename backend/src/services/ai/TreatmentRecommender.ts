import { OpenAI } from 'openai';
import { logger } from '../logger';

export class TreatmentRecommender {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async recommendTreatment(diagnosis: string, patientData: any) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a medical treatment recommendation system. Provide evidence-based treatment plans considering patient history and current condition."
          },
          {
            role: "user",
            content: JSON.stringify({
              diagnosis,
              patientData
            })
          }
        ],
        temperature: 0.3
      });

      return this.structureTreatmentPlan(response.choices[0].message.content);
    } catch (error) {
      logger.error('Treatment Recommendation Error:', error);
      throw error;
    }
  }

  private structureTreatmentPlan(rawPlan: string) {
    // Implementation to structure the treatment plan
  }
} 