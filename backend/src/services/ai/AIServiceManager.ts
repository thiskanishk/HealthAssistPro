import { Configuration, OpenAIApi } from 'openai';
import { logger } from '../../utils/logger';
import { cacheService } from '../cache';

export class AIServiceManager {
  private openai: OpenAIApi;
  private static instance: AIServiceManager;

  private constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  public static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager();
    }
    return AIServiceManager.instance;
  }

  async generateCompletion(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      cacheKey?: string;
      cacheTTL?: number;
    } = {}
  ) {
    const {
      model = 'gpt-4',
      temperature = 0.4,
      maxTokens = 1000,
      cacheKey,
      cacheTTL = 3600
    } = options;

    try {
      if (cacheKey) {
        const cached = await cacheService.get(cacheKey);
        if (cached) return cached;
      }

      const response = await this.openai.createChatCompletion({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
      });

      const result = response.data.choices[0]?.message?.content;

      if (cacheKey && result) {
        await cacheService.set(cacheKey, result, cacheTTL);
      }

      return result;
    } catch (error) {
      logger.error('AI completion failed', { error, prompt });
      throw error;
    }
  }
}

export const aiService = AIServiceManager.getInstance(); 