import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SymptomAnalyzer } from '../services/ai/SymptomAnalyzer';
import { TreatmentRecommender } from '../services/ai/TreatmentRecommender';
import { DocumentationAssistant } from '../services/ai/DocumentationAssistant';
import { DiagnosisService } from '../services/DiagnosisService';
import { aiService } from '../services/ai/AIServiceManager';

const prisma = new PrismaClient();

// Define interfaces for different data structures
interface DiagnosisResult {
  diagnoses: Array<{ condition: string; confidence: number }>;
  recommendedTests: string[];
  treatmentSuggestions: string[];
  differentialDiagnoses?: string[];
  riskFactors?: string[];
  followUpRecommendations?: string[];
}

interface FeedbackData {
  rating: number;
  comments?: string;
  providedBy: string;
}

class DiagnosisController {
  private symptomAnalyzer: SymptomAnalyzer;
  private treatmentRecommender: TreatmentRecommender;
  private documentationAssistant: DocumentationAssistant;
  private diagnosisService: DiagnosisService;

  constructor() {
    this.symptomAnalyzer = new SymptomAnalyzer();
    this.treatmentRecommender = new TreatmentRecommender();
    this.documentationAssistant = new DocumentationAssistant();
    this.diagnosisService = new DiagnosisService();
  }

  async analyzeSymptomsAndDiagnose(req: Request, res: Response): Promise<Response> {
    try {
      const { symptoms, patientId } = req.body;
      
      // Get patient data
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          medicalHistory: true,
          vitalSigns: true
        }
      });
      
      if (!patient) {
        return res.status(404).json({
          status: 'error',
          message: 'Patient not found'
        });
      }
      
      // AI-powered symptom analysis
      const symptomAnalysis = await this.symptomAnalyzer.analyzeSymptoms(
        symptoms,
        patient.vitalSigns || {},
        patient.medicalHistory || []
      );

      // Get AI diagnosis suggestions
      const diagnosisSuggestions = await aiService.generateDiagnosisSuggestion(
        symptoms,
        patient.medicalHistory || []
      );

      // Get treatment recommendations
      const treatmentPlan = await this.treatmentRecommender.recommendTreatment(
        diagnosisSuggestions.suggestions || [],
        patient
      );

      // Create a new diagnosis record
      const diagnosis = await prisma.diagnosis.create({
        data: {
          patientId,
          symptoms,
          conditions: {
            create: diagnosisSuggestions.suggestions?.map((s: any) => ({
              name: s.condition,
              confidence: s.confidence || 0,
              description: s.description || '',
              recommendedTreatments: s.treatments || []
            })) || []
          },
          treatmentPlan: treatmentPlan.recommendations?.join('\n') || '',
          aiConfidenceScore: diagnosisSuggestions.confidence || 0,
          status: 'preliminary',
          doctorId: (req.user as any)?.id
        },
        include: {
          conditions: true
        }
      });

      return res.json({
        status: 'success',
        data: {
          diagnosisId: diagnosis.id,
          symptomAnalysis,
          diagnosisSuggestions,
          treatmentPlan
        }
      });
    } catch (error) {
      console.error('Error in diagnosis analysis:', error);
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred during diagnosis analysis'
      });
    }
  }

  async requestDiagnosis(req: Request, res: Response): Promise<Response> {
    try {
      const { patientId, symptoms, notes } = req.body;
      const doctorId = (req.user as any)?.id;

      if (!doctorId) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
      }

      // Create a diagnosis request
      const diagnosisRequest = await prisma.diagnosisRequest.create({
        data: {
          patientId,
          doctorId,
          symptoms,
          notes,
          status: 'pending'
        }
      });

      return res.status(201).json({
        status: 'success',
        data: diagnosisRequest
      });
    } catch (error) {
      console.error('Error requesting diagnosis:', error);
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while requesting diagnosis'
      });
    }
  }

  async getDiagnosisById(req: Request, res: Response): Promise<Response> {
    try {
      const { patientId, diagnosisId } = req.params;

      const diagnosis = await prisma.diagnosis.findFirst({
        where: {
          id: diagnosisId,
          patientId
        },
        include: {
          conditions: true,
          patient: true,
          doctor: true
        }
      });

      if (!diagnosis) {
        return res.status(404).json({
          status: 'error',
          message: 'Diagnosis not found'
        });
      }

      return res.json({
        status: 'success',
        data: diagnosis
      });
    } catch (error) {
      console.error('Error retrieving diagnosis:', error);
      return res.status(500).json({
        status: 'error',
        message: 'An error occurred while retrieving diagnosis'
      });
    }
  }
}

// Export a singleton instance
export default new DiagnosisController();
