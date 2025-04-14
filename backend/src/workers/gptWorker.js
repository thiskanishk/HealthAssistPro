
const Queue = require('bull');
const axios = require('axios');
const mongoose = require('mongoose');
const Diagnosis = require('../models/Diagnosis');

const gptQueue = new Queue('gpt-queue', {
  redis: { host: 'localhost', port: 6379 }
});

gptQueue.process(async (job) => {
  const { patientData, userId } = job.data;

  try {
    const prompt = `Diagnose the following patient: ${JSON.stringify(patientData)}`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a medical assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    const result = response.data.choices[0].message.content;

    await Diagnosis.create({
      patientId: patientData.patientId,
      createdBy: userId,
      submittedSymptoms: patientData.symptoms,
      additionalInputs: {
        vitals: patientData.vitals,
        notes: patientData.notes
      },
      results: JSON.parse(result).results
    });

    return { status: 'completed' };
  } catch (error) {
    console.error('GPT worker error:', error.message);
    throw new Error('Failed to complete GPT job');
  }
});

console.log('🎯 GPT background worker running...');
