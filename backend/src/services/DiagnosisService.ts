import { cacheService } from './cache';
import { invalidateCache } from '../utils/cacheInvalidation';
import { DiagnosisModel, IDiagnosis } from '../models/Diagnosis';
import mongoose from 'mongoose';

export class DiagnosisService {
  private getCacheKey(patientId: string, diagnosisId: string) {
    return `diagnosis:${patientId}:${diagnosisId}`;
  }

  async getDiagnosis(patientId: string, diagnosisId: string) {
    const cacheKey = this.getCacheKey(patientId, diagnosisId);
    
    // Try to get from cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, get from database
    const diagnosis = await DiagnosisModel.findById(diagnosisId);
    if (diagnosis) {
      await cacheService.set(cacheKey, diagnosis, 1800); // 30 minutes cache
    }
    
    return diagnosis;
  }

  async updateDiagnosis(patientId: string, diagnosisId: string, data: Partial<IDiagnosis>) {
    const diagnosis = await DiagnosisModel.findByIdAndUpdate(diagnosisId, data, { new: true });
    await invalidateCache.patientData(patientId);
    return diagnosis;
  }

  async createDiagnosis(diagnosisData: Partial<IDiagnosis>) {
    const diagnosis = new DiagnosisModel(diagnosisData);
    await diagnosis.save();
    
    // Handle the patientId which could be ObjectId, IUser object or string
    let patientIdString: string | undefined;
    
    if (diagnosisData.patientId) {
      if (typeof diagnosisData.patientId === 'string') {
        patientIdString = diagnosisData.patientId;
      } else if (diagnosisData.patientId instanceof mongoose.Types.ObjectId) {
        patientIdString = diagnosisData.patientId.toString();
      } else if ('_id' in diagnosisData.patientId) {
        // It's an IUser object
        patientIdString = diagnosisData.patientId._id.toString();
      }
    }
    
    if (patientIdString) {
      await invalidateCache.patientData(patientIdString);
    }
    
    return diagnosis;
  }

  async getDiagnosesForPatient(patientId: string) {
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      throw new Error('Invalid patient ID');
    }
    
    return DiagnosisModel.find({ patientId }).sort({ createdAt: -1 });
  }

  async deleteDiagnosis(patientId: string, diagnosisId: string) {
    const result = await DiagnosisModel.deleteOne({ 
      _id: diagnosisId,
      patientId: patientId
    });
    
    if (result.deletedCount > 0) {
      await invalidateCache.patientData(patientId);
      return true;
    }
    
    return false;
  }
} 