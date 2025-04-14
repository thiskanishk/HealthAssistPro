import { MedicalDiagnosisService } from './MedicalDiagnosisService';
import { SymptomCheckerService } from './SymptomCheckerService';
import { MedicalImageAnalysisService } from './MedicalImageAnalysisService';
import { HealthAnalyticsService } from './HealthAnalyticsService';
import { createLogger } from '../../utils/logger';

export class AIServiceManager {
    private static instance: AIServiceManager;
    private services: Map<string, any>;
    private logger = createLogger('AIServiceManager');

    private constructor() {
        this.services = new Map();
        this.initializeServices();
    }

    public static getInstance(): AIServiceManager {
        if (!AIServiceManager.instance) {
            AIServiceManager.instance = new AIServiceManager();
        }
        return AIServiceManager.instance;
    }

    private initializeServices(): void {
        try {
            this.services.set('diagnosis', new MedicalDiagnosisService());
            this.services.set('symptomChecker', new SymptomCheckerService());
            this.services.set('imageAnalysis', new MedicalImageAnalysisService());
            this.services.set('healthAnalytics', new HealthAnalyticsService());
        } catch (error) {
            this.logger.error('Failed to initialize AI services', { error });
            throw error;
        }
    }

    public getService(serviceName: string): any {
        const service = this.services.get(serviceName);
        if (!service) {
            throw new Error(`AI service '${serviceName}' not found`);
        }
        return service;
    }

    public async healthCheck(): Promise<{
        status: string;
        services: Record<string, boolean>;
    }> {
        const serviceStatus: Record<string, boolean> = {};
        
        for (const [name, service] of this.services.entries()) {
            try {
                await service.ping();
                serviceStatus[name] = true;
            } catch (error) {
                this.logger.error(`Health check failed for ${name}`, { error });
                serviceStatus[name] = false;
            }
        }

        return {
            status: Object.values(serviceStatus).every(status => status) 
                ? 'healthy' 
                : 'degraded',
            services: serviceStatus
        };
    }
} 