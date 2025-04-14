
const axios = require('axios');
const AuditLog = require('../models/AuditLog');

async function sendToGPT4(promptData, userId) {
  const headers = {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const body = {
    model: 'gpt-4',
    messages: [{ role: 'system', content: promptData }],
    temperature: 0.5
  };

  let attempts = 0;
  const maxRetries = 2;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  while (attempts <= maxRetries) {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', body, { headers });
      return response.data;
    } catch (error) {
      attempts++;
      if (attempts > maxRetries) {
        await AuditLog.create({
          userId,
          action: 'GPT4_API_FAILURE',
          metadata: {
            error: error.message,
            prompt: promptData
          },
          timestamp: new Date()
        });
        throw new Error('OpenAI GPT-4 API failed after retries.');
      }
      await delay(attempts * 1000); // Exponential backoff: 1s, 2s
    }
  }
}

module.exports = { sendToGPT4 };
