import { aiService } from './AIServiceManager';
import logger from '../../utils/logger';

interface TreatmentPlan {
  recommendations: string[];
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes?: string;
  }>;
  lifestyle?: string[];
  followUp?: string;
  referrals?: string[];
  warnings?: string[];
}

export class TreatmentRecommender {
  constructor() {
    // Initialize any resources needed
  }

  /**
   * Recommend treatment based on diagnoses and patient information
   * @param diagnoses List of diagnosed conditions
   * @param patient Patient data
   * @returns Treatment plan with recommendations
   */
  async recommendTreatment(
    diagnoses: string[],
    patientData: any
  ): Promise<TreatmentPlan> {
    try {
      if (!diagnoses || diagnoses.length === 0) {
        return {
          recommendations: ['No specific treatment recommendations without a diagnosis.'],
          followUp: 'Consider further diagnostic evaluation.'
        };
      }

      const prompt = this.formatTreatmentPrompt(diagnoses, patientData);
      logger.info(`Generating treatment recommendation for diagnoses: ${diagnoses.join(', ')}`);
      
      // Call AI service to generate treatment recommendations
      const response = await aiService.analyzeMedicalReport(prompt);
      
      // Structure the response into a treatment plan
      return this.structureTreatmentPlan(response.analysis);
    } catch (error) {
      logger.error('Error generating treatment recommendations:', error);
      return {
        recommendations: ['Error generating treatment recommendations. Please consult with a healthcare provider.'],
        warnings: ['This is a system-generated fallback due to an error.']
      };
    }
  }

  /**
   * Format the prompt for the AI model
   */
  private formatTreatmentPrompt(diagnoses: string[], patientData: any): string {
    let prompt = `Provide evidence-based treatment recommendations for the following diagnosis:\n\n`;
    prompt += `Diagnoses:\n- ${diagnoses.join('\n- ')}\n\n`;
    
    prompt += `Patient Information:\n`;
    
    // Add age and gender if available
    if (patientData.age) {
      prompt += `- Age: ${patientData.age} years\n`;
    } else if (patientData.dateOfBirth) {
      const age = this.calculateAge(patientData.dateOfBirth);
      prompt += `- Age: ${age} years\n`;
    }
    
    if (patientData.gender) {
      prompt += `- Gender: ${patientData.gender}\n`;
    }
    
    // Add medical history if available
    if (patientData.medicalHistory && patientData.medicalHistory.length > 0) {
      prompt += `\nMedical History:\n`;
      patientData.medicalHistory.forEach((item: any) => {
        prompt += `- ${item.condition} (${item.status})\n`;
      });
    }
    
    // Add allergies if available
    if (patientData.allergies && patientData.allergies.length > 0) {
      prompt += `\nAllergies:\n- ${patientData.allergies.join('\n- ')}\n`;
    }
    
    // Add current medications if available
    if (patientData.medications && patientData.medications.length > 0) {
      prompt += `\nCurrent Medications:\n`;
      patientData.medications.forEach((med: any) => {
        prompt += `- ${med.name} ${med.dosage} ${med.frequency}\n`;
      });
    }
    
    prompt += `\nPlease provide a structured treatment plan with the following sections:
1. Treatment recommendations (medications, therapies, procedures)
2. Medication details (name, dosage, frequency, duration)
3. Lifestyle modifications
4. Follow-up recommendations
5. Specialist referrals (if needed)
6. Important warnings or contraindications`;
    
    return prompt;
  }

  /**
   * Structure the AI response into a standardized treatment plan
   */
  private structureTreatmentPlan(rawPlan: string): TreatmentPlan {
    try {
      // Default structure for the treatment plan
      const plan: TreatmentPlan = {
        recommendations: [],
        medications: [],
        lifestyle: [],
        followUp: '',
        referrals: [],
        warnings: []
      };
      
      // Process the AI response to extract sections
      const sections = rawPlan.split(/\n\d+\.\s+/);
      
      // Extract treatment recommendations (section 1)
      if (sections.length > 1) {
        plan.recommendations = sections[1]
          .split('\n')
          .filter(line => line.trim() && !line.match(/treatment recommendations/i))
          .map(line => line.replace(/^-\s*/, '').trim());
      }
      
      // Extract medication details (section 2)
      if (sections.length > 2) {
        const medicationLines = sections[2]
          .split('\n')
          .filter(line => line.trim() && !line.match(/medication details/i));
        
        medicationLines.forEach(line => {
          const medication = this.parseMedicationLine(line);
          if (medication) {
            plan.medications?.push(medication);
          }
        });
      }
      
      // Extract lifestyle modifications (section 3)
      if (sections.length > 3) {
        plan.lifestyle = sections[3]
          .split('\n')
          .filter(line => line.trim() && !line.match(/lifestyle modifications/i))
          .map(line => line.replace(/^-\s*/, '').trim());
      }
      
      // Extract follow-up recommendations (section 4)
      if (sections.length > 4) {
        plan.followUp = sections[4].trim();
      }
      
      // Extract specialist referrals (section 5)
      if (sections.length > 5) {
        plan.referrals = sections[5]
          .split('\n')
          .filter(line => line.trim() && !line.match(/specialist referrals/i))
          .map(line => line.replace(/^-\s*/, '').trim());
      }
      
      // Extract warnings (section 6)
      if (sections.length > 6) {
        plan.warnings = sections[6]
          .split('\n')
          .filter(line => line.trim() && !line.match(/warnings/i))
          .map(line => line.replace(/^-\s*/, '').trim());
      }
      
      return plan;
    } catch (error) {
      logger.error('Error structuring treatment plan:', error);
      // Return a minimal structure if parsing fails
      return {
        recommendations: ['Error processing treatment recommendations.'],
        warnings: ['Please consult with a healthcare provider for proper treatment.']
      };
    }
  }

  /**
   * Parse a medication line into structured data
   */
  private parseMedicationLine(line: string): { name: string; dosage: string; frequency: string; duration: string; notes?: string } | null {
    try {
      // Try to match medication details
      // Example format: "Medication Name - 10mg, once daily for 7 days"
      const regex = /(.*?)[-:]\s*([\d.]+\s*\w+)(?:,|\s+)?\s*(.*?)(?:for|duration:)\s*(.*?)(?:\.|$)(.*)?/i;
      const match = line.match(regex);
      
      if (match) {
        return {
          name: match[1].trim(),
          dosage: match[2].trim(),
          frequency: match[3].trim(),
          duration: match[4].trim(),
          notes: match[5]?.trim()
        };
      } else {
        // Simplified fallback
        const simpleMedRegex = /(.*?)[-:]\s*(.*)/i;
        const simpleMatch = line.match(simpleMedRegex);
        
        if (simpleMatch) {
          return {
            name: simpleMatch[1].trim(),
            dosage: 'As prescribed',
            frequency: 'As prescribed',
            duration: 'As directed',
            notes: simpleMatch[2]?.trim()
          };
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error parsing medication line:', error);
      return null;
    }
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date | string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
} 