import { aiService } from '../AIServiceManager';

export class MedicalReportGenerator {
  async generateReport(
    patientData: any,
    diagnosis: any,
    treatment: any
  ) {
    const prompt = `Generate a comprehensive medical report including:
      1. Patient history and demographics
      2. Current symptoms and examination findings
      3. Diagnostic results and interpretation
      4. Treatment plan and recommendations
      5. Follow-up instructions
      6. Medication details and precautions`;

    return aiService.generateCompletion(prompt, {
      temperature: 0.3,
      maxTokens: 1500,
    });
  }
} 