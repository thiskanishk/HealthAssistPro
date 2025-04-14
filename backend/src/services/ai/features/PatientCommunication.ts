import { aiService } from '../AIServiceManager';

export class PatientCommunication {
  async generatePatientInstructions(
    diagnosis: any,
    treatment: any,
    patientProfile: any
  ) {
    const prompt = `Create patient-friendly instructions for:
      Diagnosis: ${diagnosis}
      Treatment: ${treatment}
      
      Include:
      1. Simple explanation of condition
      2. Treatment steps and schedule
      3. Medication instructions
      4. Lifestyle recommendations
      5. Warning signs to watch
      6. Follow-up requirements`;

    return aiService.generateCompletion(prompt, {
      temperature: 0.4,
      maxTokens: 800,
    });
  }

  async generateFollowUpQuestions(
    previousVisit: any,
    currentSymptoms: any
  ) {
    const prompt = `Generate follow-up questions based on:
      Previous Visit: ${JSON.stringify(previousVisit)}
      Current Symptoms: ${JSON.stringify(currentSymptoms)}
      
      Focus on:
      1. Symptom changes
      2. Treatment effectiveness
      3. Side effects
      4. New concerns
      5. Compliance issues`;

    return aiService.generateCompletion(prompt, {
      temperature: 0.3,
      maxTokens: 600,
    });
  }
} 