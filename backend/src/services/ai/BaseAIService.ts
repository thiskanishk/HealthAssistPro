import { Logger } from 'winston';
import { AIModelConfig } from '../../config/ai.config';
import { createLogger } from '../../utils/logger';

export abstract class BaseAIService {
    protected config: AIModelConfig;
    protected logger: Logger;
    protected modelName: string;

    constructor(config: AIModelConfig) {
        this.config = config;
        this.modelName = config.modelName;
        this.logger = createLogger(`AI-${this.modelName}`);
    }

    protected async validateInput(input: any): Promise<boolean> {
        // Implement input validation logic
        return true;
    }

    protected async sanitizeOutput(output: any): Promise<any> {
        // Implement output sanitization
        return output;
    }

    protected async logPrediction(input: any, output: any, metadata: any): Promise<void> {
        this.logger.info('AI Prediction', {
            model: this.modelName,
            input: this.sanitizeData(input),
            output: this.sanitizeData(output),
            metadata
        });
    }

    private sanitizeData(data: any): any {
        // Remove sensitive information before logging
        const sensitiveFields = ['patientId', 'ssn', 'dob', 'address'];
        if (typeof data === 'object' && data !== null) {
            return Object.keys(data).reduce((acc, key) => {
                if (sensitiveFields.includes(key)) {
                    acc[key] = '[REDACTED]';
                } else if (typeof data[key] === 'object') {
                    acc[key] = this.sanitizeData(data[key]);
                } else {
                    acc[key] = data[key];
                }
                return acc;
            }, {});
        }
        return data;
    }

    protected async handleError(error: Error, context: string): Promise<never> {
        this.logger.error(`AI Service Error: ${context}`, {
            error: error.message,
            stack: error.stack,
            model: this.modelName
        });
        throw error;
    }
} 