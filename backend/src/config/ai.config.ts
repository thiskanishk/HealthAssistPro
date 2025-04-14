interface AIModelConfig {
    modelName: string;
    provider: string;
    version: string;
    apiEndpoint: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
}

interface AIConfig {
    openai: {
        diagnosisModel: AIModelConfig;
        medicalTranscriptionModel: AIModelConfig;
        healthAnalyticsModel: AIModelConfig;
        prescriptionModel: AIModelConfig;
    };
    azure: {
        healthInsightsModel: AIModelConfig;
        medicalImageAnalysisModel: AIModelConfig;
    };
    local: {
        triageModel: AIModelConfig;
        symptomCheckerModel: AIModelConfig;
    };
}

export const aiConfig: AIConfig = {
    openai: {
        diagnosisModel: {
            modelName: 'gpt-4',
            provider: 'openai',
            version: '1.0',
            apiEndpoint: process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1',
            maxTokens: 2000,
            temperature: 0.3,
            timeout: 30000
        },
        medicalTranscriptionModel: {
            modelName: 'whisper-1',
            provider: 'openai',
            version: '1.0',
            apiEndpoint: process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1',
            maxTokens: 4000,
            temperature: 0.2,
            timeout: 60000
        },
        healthAnalyticsModel: {
            modelName: 'gpt-4',
            provider: 'openai',
            version: '1.0',
            apiEndpoint: process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1',
            maxTokens: 3000,
            temperature: 0.4,
            timeout: 45000
        },
        prescriptionModel: {
            modelName: 'gpt-4',
            provider: 'openai',
            version: '1.0',
            apiEndpoint: process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1',
            maxTokens: 2000,
            temperature: 0.2,
            timeout: 30000
        }
    },
    azure: {
        healthInsightsModel: {
            modelName: 'azure-health-insights',
            provider: 'azure',
            version: '2.0',
            apiEndpoint: process.env.AZURE_HEALTH_ENDPOINT || 'https://api.cognitive.azure.com/health',
            maxTokens: 2000,
            temperature: 0.3,
            timeout: 30000
        },
        medicalImageAnalysisModel: {
            modelName: 'azure-medical-imaging',
            provider: 'azure',
            version: '1.0',
            apiEndpoint: process.env.AZURE_VISION_ENDPOINT || 'https://api.cognitive.azure.com/vision',
            maxTokens: 0,
            temperature: 0,
            timeout: 45000
        }
    },
    local: {
        triageModel: {
            modelName: 'triage-bert',
            provider: 'local',
            version: '1.0',
            apiEndpoint: 'http://localhost:8000',
            maxTokens: 512,
            temperature: 0.2,
            timeout: 15000
        },
        symptomCheckerModel: {
            modelName: 'symptom-analyzer',
            provider: 'local',
            version: '1.0',
            apiEndpoint: 'http://localhost:8001',
            maxTokens: 1024,
            temperature: 0.3,
            timeout: 20000
        }
    }
}; 