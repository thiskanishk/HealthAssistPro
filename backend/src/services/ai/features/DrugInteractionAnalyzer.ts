import { aiService } from '../AIServiceManager';

export class DrugInteractionAnalyzer {
  async analyzeDrugInteractions(
    medications: string[],
    patientContext: any
  ) {
    const prompt = `Analyze potential drug interactions for:
      Medications: ${medications.join(', ')}
      Patient Context: ${JSON.stringify(patientContext)}
      
      Provide:
      1. Potential interactions between medications
      2. Contraindications based on patient conditions
      3. Recommended alternatives if needed
      4. Monitoring requirements
      5. Side effects to watch for`;

    return aiService.generateCompletion(prompt, {
      temperature: 0.2,
      maxTokens: 800,
    });
  }
} 