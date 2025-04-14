const { Configuration, OpenAIApi } = require('openai');
const config = require('../config');

// Initialize OpenAI configuration
const configuration = new Configuration({
  apiKey: config.openai.apiKey
});

const openai = new OpenAIApi(configuration);

class AIDiagnosisService {
  constructor() {
    this.model = config.openai.model;
    this.maxTokens = config.openai.maxTokens;
  }

  /**
   * Format patient data for GPT-4 prompt
   */
  formatPatientData(patientData) {
    const {
      age,
      gender,
      symptoms,
      medicalHistory,
      medications,
      allergies,
      vitals
    } = patientData;

    return `
Patient Information:
- Age: ${age}
- Gender: ${gender}
- Current Symptoms: ${symptoms.join(', ')}

Medical History:
${medicalHistory.map(h => `- ${h.condition} (${h.status})`).join('\n')}

Current Medications:
${medications.map(m => `- ${m.name} (${m.dosage}, ${m.frequency})`).join('\n')}

Allergies:
${allergies.map(a => `- ${a.allergen} (Severity: ${a.severity})`).join('\n')}

Recent Vitals:
- Blood Pressure: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}
- Heart Rate: ${vitals.heartRate}
- Temperature: ${vitals.temperature}
- Respiratory Rate: ${vitals.respiratoryRate}
- Oxygen Saturation: ${vitals.oxygenSaturation}%

Based on the above information, please provide:
1. Top 3-5 potential diagnoses with confidence scores (0-100%)
2. Brief explanation for each diagnosis
3. Recommended tests or examinations
4. Suggested treatment approach
5. Lifestyle recommendations
6. Follow-up timeline
`;
  }

  /**
   * Parse GPT-4 response into structured format
   */
  parseAIResponse(response) {
    try {
      const sections = response.split('\n\n');
      
      // Extract diagnoses
      const diagnosesSection = sections.find(s => s.includes('diagnoses') || s.includes('Diagnoses'));
      const diagnoses = diagnosesSection
        .split('\n')
        .filter(line => line.includes('%'))
        .map(line => {
          const [name, rest] = line.split(':');
          const confidence = parseInt(rest.match(/(\d+)%/)[1]);
          const description = rest.split('-')[1]?.trim() || '';
          
          return {
            name: name.trim().replace(/^\d+\.\s*/, ''),
            confidence,
            description
          };
        });

      // Extract recommended tests
      const testsSection = sections.find(s => s.includes('tests') || s.includes('Tests'));
      const recommendedTests = testsSection
        .split('\n')
        .filter(line => line.startsWith('-'))
        .map(line => line.replace('-', '').trim());

      // Extract treatment suggestions
      const treatmentSection = sections.find(s => s.includes('treatment') || s.includes('Treatment'));
      const treatmentSuggestions = treatmentSection
        .split('\n')
        .filter(line => line.startsWith('-'))
        .map(line => line.replace('-', '').trim());

      return {
        diagnoses,
        recommendedTests,
        treatmentSuggestions
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Get diagnosis from GPT-4
   */
  async getDiagnosis(patientData) {
    try {
      const prompt = this.formatPatientData(patientData);

      const completion = await openai.createChatCompletion({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an AI medical assistant helping healthcare professionals with diagnosis. 
            Provide detailed, evidence-based analysis while acknowledging limitations. 
            Format your response clearly with sections for diagnoses (including confidence scores), 
            recommended tests, and treatment suggestions. Always remind that final decisions 
            should be made by qualified healthcare professionals.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.5,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const aiResponse = completion.data.choices[0].message.content;
      return this.parseAIResponse(aiResponse);
    } catch (error) {
      console.error('Error getting AI diagnosis:', error);
      throw new Error('Failed to get AI diagnosis');
    }
  }

  /**
   * Validate diagnosis results
   */
  validateDiagnosis(diagnosis) {
    const requiredFields = ['diagnoses', 'recommendedTests', 'treatmentSuggestions'];
    const missingFields = requiredFields.filter(field => !diagnosis[field]);

    if (missingFields.length > 0) {
      throw new Error(`Invalid diagnosis result. Missing fields: ${missingFields.join(', ')}`);
    }

    if (!diagnosis.diagnoses.length) {
      throw new Error('No diagnoses provided in the result');
    }

    // Validate confidence scores
    const invalidConfidence = diagnosis.diagnoses.some(
      d => typeof d.confidence !== 'number' || d.confidence < 0 || d.confidence > 100
    );

    if (invalidConfidence) {
      throw new Error('Invalid confidence scores in diagnoses');
    }

    return true;
  }

  /**
   * Process feedback and improve system
   */
  async processFeedback(diagnosisId, feedback) {
    // TODO: Implement feedback processing logic
    // This could include:
    // 1. Storing feedback in a separate collection
    // 2. Analyzing patterns in feedback
    // 3. Adjusting prompt templates based on feedback
    // 4. Generating reports on AI performance
    console.log('Processing feedback for diagnosis:', diagnosisId, feedback);
  }
}

module.exports = new AIDiagnosisService(); 