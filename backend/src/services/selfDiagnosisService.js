const OpenAI = require('openai');
const SelfDiagnosis = require('../models/SelfDiagnosis');
const { sanitizePatientData } = require('../utils/sanitizer');

class SelfDiagnosisService {
  constructor() {
    this.openai = new OpenAI(process.env.OPENAI_API_KEY);
  }

  async createDiagnosis(userId, symptoms, vitals) {
    // Sanitize patient data for HIPAA compliance
    const sanitizedData = sanitizePatientData({ symptoms, vitals });

    const prompt = this.buildGPTPrompt(sanitizedData);
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a medical AI assistant providing preliminary diagnoses. Always remind users to consult healthcare professionals."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const aiResponse = completion.choices[0].message.content;
    const parsedDiagnosis = this.parseGPTResponse(aiResponse);

    const diagnosis = new SelfDiagnosis({
      userId,
      symptoms,
      vitals,
      aiDiagnosis: parsedDiagnosis
    });

    return await diagnosis.save();
  }

  async getDiagnosisHistory(userId) {
    return await SelfDiagnosis.find({ userId })
      .sort({ createdAt: -1 });
  }

  async submitFeedback(diagnosisId, userId, rating, comment) {
    const diagnosis = await SelfDiagnosis.findOne({ 
      _id: diagnosisId, 
      userId 
    });

    if (!diagnosis) {
      throw new Error('Diagnosis not found');
    }

    diagnosis.feedback = { rating, comment };
    return await diagnosis.save();
  }

  // ... helper methods ...
}

module.exports = new SelfDiagnosisService(); 