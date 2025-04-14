import logger from '../../utils/logger';
import { aiService } from './AIServiceManager';

interface SymptomAnalysisResult {
  potentialConditions: Array<{
    name: string;
    confidence: number;
    description?: string;
  }>;
  recommendedTests: string[];
  differentialDiagnosis?: string[];
  differentialDiagnoses?: string[];
  riskFactors?: string[];
  followUpRecommendations?: string[];
  urgencyLevel?: 'low' | 'medium' | 'high' | 'emergency';
  summary?: string;
}

export class SymptomAnalyzer {
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  constructor() {
    // Initialize any resources needed
  }

  /**
   * Analyze patient symptoms and provide potential diagnoses
   * @param symptoms List of symptoms reported by the patient
   * @param vitalSigns Patient's vital signs data
   * @param medicalHistory Patient's medical history
   * @returns Analysis result with potential conditions and recommendations
   */
  async analyzeSymptoms(
    symptoms: string[],
    vitalSigns: any = {},
    medicalHistory: any[] = []
  ): Promise<SymptomAnalysisResult> {
    try {
      if (!symptoms || symptoms.length === 0) {
        throw new Error('No symptoms provided for analysis');
      }

      // Format the symptoms and patient data for AI analysis
      const prompt = this.formatPrompt(symptoms, vitalSigns, medicalHistory);
      
      logger.info(`Analyzing symptoms for diagnosis: ${symptoms.join(', ')}`);
      
      // Call AI service to analyze symptoms - using the analyzeMedicalReport method 
      // that is used in TreatmentRecommender instead of generateCompletion
      const response = await aiService.analyzeMedicalReport(prompt);

      // Parse and structure the AI response
      const analysis = this.structureAnalysis(response.analysis || '');
      
      // Log analysis for monitoring
      logger.info(`Symptom analysis completed for ${symptoms.length} symptoms`);
      
      return analysis;
    } catch (error: any) {
      logger.error('Error analyzing symptoms:', error);
      throw new Error(`Failed to analyze symptoms: ${error.message}`);
    }
  }

  /**
   * Format the prompt for the AI model
   */
  private formatPrompt(symptoms: string[], vitalSigns: any, medicalHistory: any[]): string {
    let prompt = `Analyze the following patient symptoms and provide a detailed medical assessment:\n\n`;
    prompt += `Symptoms:\n- ${symptoms.join('\n- ')}\n\n`;
    
    if (Object.keys(vitalSigns).length > 0) {
      prompt += `Vital Signs:\n`;
      for (const [key, value] of Object.entries(vitalSigns)) {
        prompt += `- ${key}: ${value}\n`;
      }
      prompt += '\n';
    }
    
    if (medicalHistory && medicalHistory.length > 0) {
      prompt += `Medical History:\n`;
      medicalHistory.forEach(item => {
        prompt += `- ${item.condition} (${item.status})\n`;
      });
      prompt += '\n';
    }
    
    prompt += `Please provide a structured response with the following sections:
1. Potential diagnoses with confidence levels (0-1 scale)
2. Differential diagnoses to consider
3. Recommended diagnostic tests
4. Risk factors identified
5. Follow-up recommendations
6. Urgency level (low, medium, high, or emergency)
7. Brief summary of assessment`;
    
    return prompt;
  }

  /**
   * Structure the AI response into a standardized format
   */
  private structureAnalysis(rawAnalysis: string): SymptomAnalysisResult {
    try {
      // Default structure for the analysis
      const analysis: SymptomAnalysisResult = {
        potentialConditions: [],
        recommendedTests: [],
        differentialDiagnoses: [],
        riskFactors: [],
        followUpRecommendations: [],
        urgencyLevel: 'medium',
        summary: ''
      };
      
      // Process the AI response to extract sections
      const sections = rawAnalysis.split(/\n\d+\.\s+/);
      
      // Extract potential diagnoses (section 1)
      if (sections.length > 1) {
        const diagnosesSection = sections[1] || '';
        const diagnosesLines = diagnosesSection.split('\n').filter(line => line.trim());
        
        diagnosesLines.forEach(line => {
          // Extract condition name and confidence
          const match = line.match(/(.*?)(?:\s*-\s*|\s*:\s*)(?:confidence[\s:]*)?([\d.]+)/i);
          if (match) {
            const condition = match[1].trim();
            const confidence = parseFloat(match[2]);
            
            if (condition && !isNaN(confidence)) {
              analysis.potentialConditions.push({
                name: condition,
                confidence: confidence
              });
            }
          }
        });
      }
      
      // Extract differential diagnoses (section 2)
      if (sections.length > 2) {
        analysis.differentialDiagnoses = sections[2]
          .split('\n')
          .filter(line => line.trim() && !line.match(/differential diagnoses/i))
          .map(line => line.replace(/^-\s*/, '').trim());
      }
      
      // Extract recommended tests (section 3)
      if (sections.length > 3) {
        analysis.recommendedTests = sections[3]
          .split('\n')
          .filter(line => line.trim() && !line.match(/recommended tests/i))
          .map(line => line.replace(/^-\s*/, '').trim());
      }
      
      // Extract risk factors (section 4)
      if (sections.length > 4) {
        analysis.riskFactors = sections[4]
          .split('\n')
          .filter(line => line.trim() && !line.match(/risk factors/i))
          .map(line => line.replace(/^-\s*/, '').trim());
      }
      
      // Extract follow-up recommendations (section 5)
      if (sections.length > 5) {
        analysis.followUpRecommendations = sections[5]
          .split('\n')
          .filter(line => line.trim() && !line.match(/follow-up recommendations/i))
          .map(line => line.replace(/^-\s*/, '').trim());
      }
      
      // Extract urgency level (section 6)
      if (sections.length > 6) {
        const urgencySection = sections[6].toLowerCase();
        if (urgencySection.includes('emergency')) {
          analysis.urgencyLevel = 'emergency';
        } else if (urgencySection.includes('high')) {
          analysis.urgencyLevel = 'high';
        } else if (urgencySection.includes('medium')) {
          analysis.urgencyLevel = 'medium';
        } else if (urgencySection.includes('low')) {
          analysis.urgencyLevel = 'low';
        }
      }
      
      // Extract summary (section 7)
      if (sections.length > 7) {
        analysis.summary = sections[7].trim();
      }
      
      return analysis;
    } catch (error) {
      logger.error('Error structuring analysis:', error);
      // Return a minimal structure if parsing fails
      return {
        potentialConditions: [],
        recommendedTests: [],
        summary: 'Error processing analysis results'
      };
    }
  }
} 