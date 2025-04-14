const { Configuration, OpenAIApi } = require('openai');
const config = require('../config');
const Visit = require('../models/Visit');
const Patient = require('../models/Patient');
const aiLearning = require('./aiLearning');

const configuration = new Configuration({
  apiKey: config.openai.apiKey
});

const openai = new OpenAIApi(configuration);

class VisitPredictionService {
  constructor() {
    this.model = config.openai.model;
    this.maxTokens = config.openai.maxTokens;
  }

  /**
   * Predict visit duration based on patient history and appointment type
   */
  async predictVisitDuration(appointmentData, patientId) {
    try {
      // Get patient context
      const patient = await Patient.findById(patientId)
        .select('age gender medicalHistory medications allergies lastVisit');

      // Get historical visit data
      const historicalVisits = await Visit.find({
        patientId,
        status: 'completed'
      }).sort('-date').limit(10);

      const prompt = this.formatDurationPrompt(appointmentData, patient, historicalVisits);

      const completion = await openai.createChatCompletion({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an AI healthcare scheduling assistant. Analyze patient history, 
            appointment type, and historical visit patterns to predict optimal appointment duration. 
            Consider factors like medical complexity, age, communication needs, and procedure types.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      let prediction = this.parseDurationResponse(completion.data.choices[0].message.content);

      // Apply learning adjustments
      prediction = await aiLearning.applyLearningAdjustments('visit_duration', prediction);

      return prediction;
    } catch (error) {
      console.error('Error predicting visit duration:', error);
      throw new Error('Failed to predict visit duration');
    }
  }

  /**
   * Suggest optimal scheduling slots based on predicted duration and constraints
   */
  async suggestSchedulingSlots(appointmentData, patientId, availableSlots) {
    try {
      const durationPrediction = await this.predictVisitDuration(appointmentData, patientId);
      
      const prompt = this.formatSchedulingPrompt(
        appointmentData,
        durationPrediction,
        availableSlots
      );

      const completion = await openai.createChatCompletion({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are an AI healthcare scheduling optimizer. Analyze appointment requirements, 
            predicted duration, and available slots to recommend optimal scheduling options. 
            Consider factors like time of day preferences, urgency, and potential schedule impacts.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.2
      });

      let prediction = this.parseSchedulingResponse(completion.data.choices[0].message.content);

      // Apply learning adjustments
      prediction = await aiLearning.applyLearningAdjustments('scheduling', prediction);

      return prediction;
    } catch (error) {
      console.error('Error suggesting scheduling slots:', error);
      throw new Error('Failed to suggest scheduling slots');
    }
  }

  formatDurationPrompt(appointmentData, patient, historicalVisits) {
    return `
Appointment Information:
${JSON.stringify(appointmentData, null, 2)}

Patient Information:
${JSON.stringify(patient, null, 2)}

Historical Visit Data:
${historicalVisits.map(visit => `
- Date: ${visit.date}
  Type: ${visit.type}
  Duration: ${visit.duration} minutes
  Complexity: ${visit.complexity}
  Notes: ${visit.notes}
`).join('\n')}

Please analyze and provide:
1. Predicted appointment duration in minutes
2. Confidence score (0-100%)
3. Factors influencing the prediction
4. Potential scheduling considerations
`;
  }

  formatSchedulingPrompt(appointmentData, durationPrediction, availableSlots) {
    return `
Appointment Details:
${JSON.stringify(appointmentData, null, 2)}

Predicted Duration:
${JSON.stringify(durationPrediction, null, 2)}

Available Slots:
${availableSlots.map(slot => `
- Start: ${slot.start}
  End: ${slot.end}
  Day: ${slot.day}
  Provider: ${slot.provider}
`).join('\n')}

Please analyze and provide:
1. Top 3 recommended slots
2. Reasoning for each recommendation
3. Potential schedule impact considerations
4. Backup slot suggestions
`;
  }

  parseDurationResponse(response) {
    try {
      const sections = response.split('\n\n');
      return {
        predictedDuration: parseInt(sections[0].match(/\d+/)[0]),
        confidence: parseInt(sections[1].match(/\d+/)[0]),
        factors: sections[2].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2)),
        considerations: sections[3].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2))
      };
    } catch (error) {
      throw new Error('Failed to parse duration prediction response');
    }
  }

  parseSchedulingResponse(response) {
    try {
      const sections = response.split('\n\n');
      return {
        recommendedSlots: sections[0].split('\n').filter(line => line.startsWith('-')).map(slot => {
          const [time, score] = slot.slice(2).split(' - ');
          return {
            time,
            score: parseInt(score.match(/\d+/)[0])
          };
        }),
        reasoning: sections[1].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2)),
        impactConsiderations: sections[2].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2)),
        backupSlots: sections[3].split('\n').filter(line => line.startsWith('-')).map(line => line.slice(2))
      };
    } catch (error) {
      throw new Error('Failed to parse scheduling suggestions response');
    }
  }
}

module.exports = new VisitPredictionService(); 