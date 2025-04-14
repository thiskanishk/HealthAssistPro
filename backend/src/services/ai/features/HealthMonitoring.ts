import { aiService } from '../AIServiceManager';

export class HealthMonitoring {
  async analyzeHealthTrends(patientData: any) {
    const prompt = `Analyze patient health trends:
      1. Vital signs patterns
      2. Symptom progression
      3. Treatment response
      4. Risk factor changes
      5. Lifestyle impact
      
      Provide:
      1. Trend analysis
      2. Early warning indicators
      3. Recommended interventions
      4. Lifestyle modification suggestions`;

    return aiService.generateCompletion(prompt, {
      temperature: 0.3,
      maxTokens: 1000,
    });
  }

  async predictHealthRisks(patientProfile: any) {
    const prompt = `Based on patient profile, predict:
      1. Potential health risks
      2. Preventive measures
      3. Recommended screenings
      4. Lifestyle modifications
      5. Risk mitigation strategies`;

    return aiService.generateCompletion(prompt, {
      temperature: 0.3,
      maxTokens: 800,
    });
  }
} 