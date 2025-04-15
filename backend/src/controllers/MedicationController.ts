import { Request, Response } from 'express';
import { PrescriptionSuggestionService } from '../services/ai/PrescriptionSuggestionService';
import { DrugInteractionService } from '../services/ai/DrugInteractionService';
import { MedicationRepository } from '../repositories/MedicationRepository';
import { MedicationSafetyMonitor } from '../services/MedicationSafetyMonitor';
import mongoose, { Model } from 'mongoose';
import { IMedication } from '../models/Medication';
import { TreatmentGuideline } from '../models/TreatmentGuideline';
import { MedicationSafetyIssue } from '../models/MedicationSafetyIssue';
import logger from '../utils/logger';

// Get the Medication model
import '../models/Medication'; // This ensures the model is registered
const Medication = mongoose.model<IMedication>('Medication');

class MedicationController {
  private prescriptionService: PrescriptionSuggestionService;
  private medicationRepository: MedicationRepository;
  private safetyMonitor: MedicationSafetyMonitor;
  private drugInteractionService: DrugInteractionService;

  constructor() {
    this.prescriptionService = new PrescriptionSuggestionService();
    this.medicationRepository = MedicationRepository.getInstance();
    this.safetyMonitor = MedicationSafetyMonitor.getInstance();
    this.drugInteractionService = DrugInteractionService.getInstance();
  }

  // Get AI-powered prescription suggestions
  public suggestPrescriptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        symptoms, 
        diagnosis = "Unspecified diagnosis",
        vitalSigns = {},
        labResults = [],
        allergies = [],
        chronicConditions = [],
        age = 40,
        weight = 70,
        gender = "unknown"
      } = req.body;
      
      const patientId = req.body.patientId;
      const currentMedications = req.body.currentMedications || [];

      if (!patientId || !symptoms || !Array.isArray(symptoms)) {
        res.status(400).json({ error: 'Invalid input: patientId and symptoms array are required' });
        return;
      }

      // Prepare the prescription input in the format expected by PrescriptionSuggestionService
      const prescriptionInput = {
        diagnosis,
        symptoms,
        patientData: {
          age,
          weight,
          gender,
          allergies,
          currentMedications,
          chronicConditions
        },
        vitalSigns: {
          bloodPressure: vitalSigns.bloodPressure || "120/80",
          heartRate: vitalSigns.heartRate || 70,
          temperature: vitalSigns.temperature || 37,
          respiratoryRate: vitalSigns.respiratoryRate,
          oxygenSaturation: vitalSigns.oxygenSaturation
        },
        labResults
      };

      const suggestions = await this.prescriptionService.suggestPrescription(prescriptionInput);

      res.status(200).json(suggestions);
    } catch (error) {
      logger.error('Error in medication suggestion:', error);
      if (error.name === 'PrescriptionValidationError') {
        res.status(400).json({ error: error.message });
      } else if (error.name === 'DrugInteractionError') {
        res.status(409).json({ error: error.message, interactions: error.interactions });
      } else {
        res.status(500).json({ error: 'Failed to generate prescription suggestions' });
      }
    }
  };

  // Get medication information
  public getMedicationInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name } = req.params;
      
      if (!name) {
        res.status(400).json({ error: 'Medication name is required' });
        return;
      }

      const medication = await this.medicationRepository.getMedicationByName(name);
      
      if (!medication) {
        res.status(404).json({ error: 'Medication not found' });
        return;
      }

      res.status(200).json(medication);
    } catch (error) {
      logger.error('Error fetching medication info:', error);
      res.status(500).json({ error: 'Failed to fetch medication information' });
    }
  };

  // Search medications
  public searchMedications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, limit = 10 } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const medications = await Medication.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(Number(limit))
        .lean();

      res.status(200).json(medications);
    } catch (error) {
      logger.error('Error searching medications:', error);
      res.status(500).json({ error: 'Failed to search medications' });
    }
  };

  // Check drug interactions
  public checkInteractions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { medication, currentMedications } = req.body;
      
      if (!medication || !currentMedications || !Array.isArray(currentMedications)) {
        res.status(400).json({ error: 'Medication and currentMedications array are required' });
        return;
      }

      const interactions = await this.drugInteractionService.checkInteractions(
        medication, 
        currentMedications
      );
      
      res.status(200).json(interactions);
    } catch (error) {
      logger.error('Error checking drug interactions:', error);
      res.status(500).json({ error: 'Failed to check drug interactions' });
    }
  };

  // Get treatment guidelines for a condition
  public getTreatmentGuidelines = async (req: Request, res: Response): Promise<void> => {
    try {
      const { condition } = req.params;
      
      if (!condition) {
        res.status(400).json({ error: 'Condition is required' });
        return;
      }

      const guidelines = await TreatmentGuideline.findOne({ 
        $or: [
          { condition: { $regex: new RegExp(condition, 'i') } },
          { icd10Codes: condition }
        ]
      }).lean();
      
      if (!guidelines) {
        res.status(404).json({ error: 'Treatment guidelines not found for this condition' });
        return;
      }

      res.status(200).json(guidelines);
    } catch (error) {
      logger.error('Error fetching treatment guidelines:', error);
      res.status(500).json({ error: 'Failed to fetch treatment guidelines' });
    }
  };

  // Report medication safety issue
  public reportSafetyIssue = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        patientId, 
        medications, 
        issueType, 
        severity, 
        description, 
        symptoms, 
        providerId,
        relatedPrescriptionIds 
      } = req.body;

      if (!patientId || !medications || !issueType || !severity || !description) {
        res.status(400).json({ error: 'Missing required fields for safety issue report' });
        return;
      }

      // Create the safety issue in the database
      const safetyIssue = new MedicationSafetyIssue({
        patientId: new mongoose.Types.ObjectId(patientId),
        providerId: providerId ? new mongoose.Types.ObjectId(providerId) : undefined,
        medications,
        issueType,
        severity,
        description,
        symptoms: symptoms || [],
        relatedPrescriptionIds
      });

      await safetyIssue.save();

      // Register in the safety monitor - omitting 'id', 'reportDate', and 'status' as these will be added by the service
      const reportedIssue = await this.safetyMonitor.reportSafetyIssue({
        patientId,
        providerId,
        medications,
        issueType,
        severity,
        description,
        symptoms: symptoms || [],
        relatedPrescriptionIds: relatedPrescriptionIds || []
      });

      res.status(201).json({ 
        message: 'Safety issue reported successfully', 
        issueId: safetyIssue._id 
      });
    } catch (error) {
      logger.error('Error reporting safety issue:', error);
      res.status(500).json({ error: 'Failed to report safety issue' });
    }
  };

  // Get safety issues
  public getSafetyIssues = async (req: Request, res: Response): Promise<void> => {
    try {
      const { patientId, status, severity, medication } = req.query;
      
      const query: any = {};
      
      if (patientId) {
        query.patientId = new mongoose.Types.ObjectId(patientId as string);
      }
      
      if (status) {
        query.status = status;
      }
      
      if (severity) {
        query.severity = severity;
      }
      
      if (medication) {
        query.medications = { $in: [medication] };
      }
      
      const issues = await MedicationSafetyIssue.find(query)
        .sort({ reportDate: -1 })
        .lean();
        
      res.status(200).json(issues);
    } catch (error) {
      logger.error('Error fetching safety issues:', error);
      res.status(500).json({ error: 'Failed to fetch safety issues' });
    }
  };

  // Update safety issue status
  public updateSafetyIssueStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { issueId } = req.params;
      const { status, resolution } = req.body;
      
      if (!issueId || !status) {
        res.status(400).json({ error: 'Issue ID and status are required' });
        return;
      }
      
      const issue = await MedicationSafetyIssue.findById(issueId);
      
      if (!issue) {
        res.status(404).json({ error: 'Safety issue not found' });
        return;
      }
      
      issue.status = status;
      
      if (resolution) {
        issue.resolution = resolution;
      }
      
      if (status === 'RESOLVED' && !issue.resolvedDate) {
        issue.resolvedDate = new Date();
      }
      
      await issue.save();
      
      // Update in safety monitor
      this.safetyMonitor.updateIssueStatus(issueId, status, resolution);
      
      res.status(200).json({ message: 'Safety issue updated successfully' });
    } catch (error) {
      logger.error('Error updating safety issue:', error);
      res.status(500).json({ error: 'Failed to update safety issue' });
    }
  };

  // Get safety statistics
  public getSafetyStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      // Calculate dates for the past 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const statistics = await this.safetyMonitor.generateSafetyStatistics(startDate, endDate);
      res.status(200).json(statistics);
    } catch (error) {
      logger.error('Error fetching safety statistics:', error);
      res.status(500).json({ error: 'Failed to fetch safety statistics' });
    }
  };
}

export default new MedicationController(); 