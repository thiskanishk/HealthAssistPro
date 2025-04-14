import { Request, Response } from 'express';
import { PrescriptionSuggestionService } from '../services/ai/PrescriptionSuggestionService';
import { FollowUpMonitoringService } from '../services/FollowUpMonitoringService';
import { MedicalHistoryAnalysisService } from '../services/ai/MedicalHistoryAnalysisService';

export class MedicalAnalysisController {
    private prescriptionService: PrescriptionSuggestionService;
    private followUpService: FollowUpMonitoringService;
    private historyAnalysisService: MedicalHistoryAnalysisService;

    constructor() {
        this.prescriptionService = new PrescriptionSuggestionService();
        this.followUpService = new FollowUpMonitoringService();
        this.historyAnalysisService = new MedicalHistoryAnalysisService();
    }

    async generateComprehensiveAnalysis(req: Request, res: Response) {
        try {
            const { patientId, diagnosis, symptoms } = req.body;

            // Analyze medical history
            const historyAnalysis = await this.historyAnalysisService.analyzeHistory(patientId);

            // Generate prescription suggestions
            const prescriptionSuggestions = await this.prescriptionService.suggestPrescription({
                diagnosis,
                symptoms,
                patientData: historyAnalysis.patientData,
                vitalSigns: req.body.vitalSigns
            });

            // Create follow-up plan
            const followUpPlan = await this.followUpService.createFollowUpPlan(
                diagnosis,
                patientId,
                prescriptionSuggestions
            );

            return res.status(200).json({
                status: 'success',
                data: {
                    historyAnalysis,
                    prescriptionSuggestions,
                    followUpPlan
                }
            });

        } catch (error) {
            console.error('Comprehensive analysis error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'An error occurred during analysis'
            });
        }
    }
} 