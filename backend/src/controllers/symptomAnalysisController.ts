import { Request, Response } from 'express';
import { SymptomAnalysisService } from '../services/ai/SymptomAnalysisService';
import { validateSymptomInput } from '../validators/symptomValidator';

export class SymptomAnalysisController {
    private symptomService: SymptomAnalysisService;

    constructor() {
        this.symptomService = new SymptomAnalysisService();
    }

    async analyzeSymptoms(req: Request, res: Response) {
        try {
            // Validate input
            const validationResult = await validateSymptomInput(req.body);
            if (!validationResult.success) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid input',
                    errors: validationResult.errors
                });
            }

            // Perform analysis
            const analysis = await this.symptomService.analyzeSymptoms(req.body);

            // Check for urgent conditions
            if (analysis.urgencyLevel === 'immediate') {
                // Trigger urgent care notification
                await this.notifyUrgentCare(analysis);
            }

            return res.status(200).json({
                status: 'success',
                data: analysis
            });

        } catch (error) {
            console.error('Symptom analysis error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'An error occurred during symptom analysis'
            });
        }
    }

    private async notifyUrgentCare(analysis: any) {
        // Implement urgent care notification system
    }
} 