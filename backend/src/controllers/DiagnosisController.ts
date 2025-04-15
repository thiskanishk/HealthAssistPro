import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai/AIServiceManager';
import { SymptomAnalyzer } from '../services/ai/SymptomAnalyzer';
import { TreatmentRecommender } from '../services/ai/TreatmentRecommender';
import { DocumentationAssistant } from '../services/ai/DocumentationAssistant';
import { Patient, PatientData } from '../models/Patient';
import { DiagnosisService } from '../services/DiagnosisService';
import { DiagnosisModel, IDiagnosis } from '../models/Diagnosis';
import mongoose from 'mongoose';

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

export class DiagnosisController {
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

  public async analyzeSymptomsAndDiagnose(req: Request, res: Response, next: NextFunction) {
    try {
      const { symptoms, patientId } = req.body;
      
      // Get patient history
      const patient = await Patient.findById(patientId).populate('medicalHistory');
      
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

      // Generate medical notes
      let medicalNotes: string = '';
      try {
        // Use type assertion to handle the return type
        const result = await this.documentationAssistant.generateMedicalNotes({
          symptoms,
          analysis: symptomAnalysis,
          diagnosis: diagnosisSuggestions,
          treatment: treatmentPlan
        }) as unknown;
        
        // Now safely check the type
        if (typeof result === 'string') {
          medicalNotes = result;
        }
      } catch (error) {
        console.error('Error generating medical notes:', error);
      }

      // Create a new diagnosis record
      const diagnosis = await this.diagnosisService.createDiagnosis({
        patientId,
        chiefComplaint: symptoms[0] || 'Not specified',
        symptoms,
        vitalSigns: {
          // Convert patient vital signs to the format expected by the diagnosis model
          temperature: patient.vitalSigns?.temperature,
          bloodPressure: {
            systolic: typeof patient.vitalSigns?.bloodPressure === 'string' 
              ? parseInt(patient.vitalSigns.bloodPressure.split('/')[0], 10) || 120
              : 120,
            diastolic: typeof patient.vitalSigns?.bloodPressure === 'string'
              ? parseInt(patient.vitalSigns.bloodPressure.split('/')[1], 10) || 80
              : 80
          },
          heartRate: patient.vitalSigns?.heartRate,
          respiratoryRate: patient.vitalSigns?.respiratoryRate,
          oxygenSaturation: patient.vitalSigns?.oxygenSaturation,
          weight: patient.vitalSigns?.weight,
          height: patient.vitalSigns?.height,
          // Skip bmi since it doesn't exist in the patient model
        },
        medicalConditions: diagnosisSuggestions.suggestions?.map((s: any) => ({
          name: s.condition,
          confidence: s.confidence || 0,
          description: s.description || '',
          recommendedTreatments: s.treatments || []
        })) || [],
        treatmentPlan: (() => {
          try {
            if (Array.isArray(treatmentPlan.recommendations)) {
              return treatmentPlan.recommendations.join('\n');
            } else if (typeof treatmentPlan.recommendations === 'string') {
              return treatmentPlan.recommendations;
            }
            return '';
          } catch (e) {
            return '';
          }
        })(),
        notes: medicalNotes,
        aiGenerated: true,
        aiConfidenceScore: typeof diagnosisSuggestions.confidence === 'string' 
          ? parseInt(diagnosisSuggestions.confidence, 10)
          : diagnosisSuggestions.confidence || 0,
        status: 'preliminary'
      });

      res.json({
        status: 'success',
        data: {
          diagnosisId: diagnosis._id,
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

  /**
   * Generate a diagnosis based on patient data
   * @param patientData Patient's data including symptoms, medical history, etc.
   * @returns Diagnosis result with potential conditions, recommendations, etc.
   */
  public async generateDiagnosis(patientData: PatientData): Promise<DiagnosisResult> {
    try {
      // AI-powered symptom analysis
      const symptomAnalysis = await this.symptomAnalyzer.analyzeSymptoms(
        patientData.symptoms,
        patientData.vitals || {},
        patientData.medicalHistory || []
      );

      // Process the symptom analysis and create a diagnosis result
      const diagnosisResult: DiagnosisResult = {
        diagnoses: symptomAnalysis.potentialConditions.map(condition => ({
          condition: condition.name,
          confidence: condition.confidence
        })),
        recommendedTests: symptomAnalysis.recommendedTests || [],
        treatmentSuggestions: [],
        differentialDiagnoses: symptomAnalysis.differentialDiagnoses,
        riskFactors: symptomAnalysis.riskFactors,
        followUpRecommendations: symptomAnalysis.followUpRecommendations
      };

      // Get treatment recommendations
      const treatmentPlan = await this.treatmentRecommender.recommendTreatment(
        diagnosisResult.diagnoses.map(d => d.condition),
        patientData
      );

      diagnosisResult.treatmentSuggestions = treatmentPlan.recommendations || [];

      return diagnosisResult;
    } catch (error) {
      console.error('Error generating diagnosis:', error);
      throw new Error('Failed to generate diagnosis');
    }
  }

  /**
   * Process feedback for a diagnosis
   * @param diagnosisId ID of the diagnosis
   * @param feedback Feedback data including rating and comments
   */
  public async processFeedback(diagnosisId: string, feedback: FeedbackData): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(diagnosisId)) {
        throw new Error('Invalid diagnosis ID');
      }

      // Get the diagnosis
      const diagnosis = await DiagnosisModel.findById(diagnosisId);

      if (!diagnosis) {
        throw new Error('Diagnosis not found');
      }

      // Convert the providedBy string to a mongoose ObjectId reference
      let providedById: any;  // Using 'any' to accommodate both ObjectId and IUser
      
      try {
        if (mongoose.Types.ObjectId.isValid(feedback.providedBy)) {
          providedById = new mongoose.Types.ObjectId(feedback.providedBy);
        } else {
          throw new Error('Invalid providedBy ID format');
        }
      } catch (error) {
        console.error('Invalid providedBy ID format:', error);
        throw new Error('Invalid providedBy ID format');
      }

      // Update the diagnosis with clinician feedback
      await this.diagnosisService.updateDiagnosis(
        diagnosis.patientId.toString(), 
        diagnosisId, 
        {
          clinicianFeedback: {
            clinicianId: providedById,
            comments: feedback.comments || '',
            agreementLevel: feedback.rating >= 4 ? 'full' : (feedback.rating >= 2 ? 'partial' : 'none'),
            createdAt: new Date()
          }
        }
      );

      // In a real implementation, you would process the feedback
      // and potentially use it to improve the AI model
      console.log(`Processing feedback for diagnosis ${diagnosisId}:`, feedback);
    } catch (error) {
      console.error('Error processing feedback:', error);
      throw error;
    }
  }

  /**
   * Get all diagnoses for a patient
   */
  public async getPatientDiagnoses(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId } = req.params;
      
      const diagnoses = await this.diagnosisService.getDiagnosesForPatient(patientId);
      
      res.json({
        status: 'success',
        data: diagnoses
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific diagnosis by ID
   */
  public async getDiagnosisById(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId, diagnosisId } = req.params;
      
      const diagnosis = await this.diagnosisService.getDiagnosis(patientId, diagnosisId);
      
      if (!diagnosis) {
        return res.status(404).json({
          status: 'error',
          message: 'Diagnosis not found'
        });
      }
      
      res.json({
        status: 'success',
        data: diagnosis
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export an instance of the controller for singleton usage
export default new DiagnosisController();
