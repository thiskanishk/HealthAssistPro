import { Request, Response } from 'express';
import { aiService } from '../services/ai/AIServiceManager';
import { SymptomAnalyzer } from '../services/ai/SymptomAnalyzer';
import { TreatmentRecommender } from '../services/ai/TreatmentRecommender';
import { DocumentationAssistant } from '../services/ai/DocumentationAssistant';

export class DiagnosisController {
  private symptomAnalyzer: SymptomAnalyzer;
  private treatmentRecommender: TreatmentRecommender;
  private documentationAssistant: DocumentationAssistant;

  constructor() {
    this.symptomAnalyzer = new SymptomAnalyzer();
    this.treatmentRecommender = new TreatmentRecommender();
    this.documentationAssistant = new DocumentationAssistant();
  }

  async analyzeSymptomsAndDiagnose(req: Request, res: Response) {
    try {
      const { symptoms, patientId } = req.body;
      
      // Get patient history
      const patient = await Patient.findById(patientId).populate('medicalHistory');
      
      // AI-powered symptom analysis
      const symptomAnalysis = await this.symptomAnalyzer.analyzeSymptoms(
        symptoms,
        patient.vitalSigns,
        patient.medicalHistory
      );

      // Get AI diagnosis suggestions
      const diagnosisSuggestions = await aiService.generateDiagnosisSuggestion(
        symptoms,
        patient.medicalHistory
      );

      // Get treatment recommendations
      const treatmentPlan = await this.treatmentRecommender.recommendTreatment(
        diagnosisSuggestions.suggestions,
        patient
      );

      // Generate medical notes
      const medicalNotes = await this.documentationAssistant.generateMedicalNotes({
        symptoms,
        analysis: symptomAnalysis,
        diagnosis: diagnosisSuggestions,
        treatment: treatmentPlan
      });

      res.json({
        status: 'success',
        data: {
          symptomAnalysis,
          diagnosisSuggestions,
          treatmentPlan,
          medicalNotes
        }
      });
    } catch (error) {
      next(error);
    }
  }
} 