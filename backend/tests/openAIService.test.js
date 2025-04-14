
const openAIService = require('../src/services/openAIService');

describe('OpenAI Service', () => {
  test('should expose sendToGPT4 method', () => {
    expect(typeof openAIService.sendToGPT4).toBe('function');
  });
});
