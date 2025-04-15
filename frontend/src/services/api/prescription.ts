import axios from 'axios';
import { API_BASE_URL } from './config';

// Types
export interface DrugInteractionRisk {
  interactingDrug: string;
  severity: 'high' | 'moderate' | 'low';
  description: string;
}

export interface PrescriptionSuggestion {
  medicationName: string;
  genericName?: string;
  brandNames?: string[];
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  warnings: string[];
  contraindications: string[];
  sideEffects: string[];
  alternatives: string[];
  interactionRisks: DrugInteractionRisk[];
  status: 'recommended' | 'alternative' | 'use_with_caution' | 'not_recommended';
  efficacyInfo?: {
    efficacyScore: number;
    evidenceLevel: 'high' | 'moderate' | 'low' | 'insufficient';
    recommendationStrength: 'strong' | 'moderate' | 'conditional' | 'against';
  };
  safetyAlerts?: {
    type: string;
    severity: string;
    message: string;
  }[];
  dosageAnalysis?: {
    isAppropriate: boolean;
    message?: string;
  };
  compatibility?: {
    patientFactors: Array<{
      factor: string;
      isCompatible: boolean;
      notes: string;
    }>;
    diseaseFactors: Array<{
      condition: string;
      isCompatible: boolean;
      notes: string;
    }>;
  };
}

export interface PrescriptionRecommendationRequest {
  patientId: string;
  diagnosis: string;
  symptoms: string[];
  patientAge?: number;
  patientWeight?: number;
  currentMedications?: string[];
  allergies?: string[];
  conditions?: string[];
}

export interface PrescriptionRecommendationResponse {
  recommendations: PrescriptionSuggestion[];
  patientId: string;
  createdAt: string;
  requestId: string;
}

export interface PrescriptionFeedback {
  medicationName: string;
  isPositive: boolean;
  feedbackText: string;
  doctorId: string;
  patientId: string;
  requestId: string;
}

export interface PrescriptionToCreate {
  patientId: string;
  doctorId: string;
  medication: PrescriptionSuggestion;
  additionalNotes?: string;
}

const prescriptionApi = {
  /**
   * Get AI-generated prescription recommendations based on patient data
   */
  getRecommendations: async (data: PrescriptionRecommendationRequest): Promise<PrescriptionRecommendationResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/prescription-recommendations`, data);
      return response.data;
    } catch (error) {
      console.error('Error fetching prescription recommendations:', error);
      throw error;
    }
  },

  /**
   * Request alternative medications for a given medication
   */
  getAlternatives: async (medicationName: string, patientId: string): Promise<PrescriptionSuggestion[]> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/prescription-recommendations/alternatives`, 
        { 
          params: { 
            medicationName,
            patientId 
          } 
        }
      );
      return response.data.alternatives;
    } catch (error) {
      console.error('Error fetching medication alternatives:', error);
      throw error;
    }
  },

  /**
   * Submit feedback for an AI-generated prescription recommendation
   */
  submitFeedback: async (feedback: PrescriptionFeedback): Promise<{ success: boolean }> => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/prescription-recommendations/feedback`,
        feedback
      );
      return response.data;
    } catch (error) {
      console.error('Error submitting prescription feedback:', error);
      throw error;
    }
  },

  /**
   * Create a new prescription based on a recommendation
   */
  createPrescription: async (prescription: PrescriptionToCreate): Promise<{ prescriptionId: string }> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/prescriptions`, prescription);
      return response.data;
    } catch (error) {
      console.error('Error creating prescription:', error);
      throw error;
    }
  },

  /**
   * Get prescription history for a patient
   */
  getPatientPrescriptionHistory: async (patientId: string): Promise<any[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/prescriptions/patient/${patientId}`);
      return response.data.prescriptions;
    } catch (error) {
      console.error('Error fetching patient prescription history:', error);
      throw error;
    }
  }
};

export default prescriptionApi; 