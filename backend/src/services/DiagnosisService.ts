import { cacheService } from './cache';
import { invalidateCache } from '../utils/cacheInvalidation';

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

  async updateDiagnosis(patientId: string, diagnosisId: string, data: any) {
    const diagnosis = await DiagnosisModel.findByIdAndUpdate(diagnosisId, data);
    await invalidateCache.patientData(patientId);
    return diagnosis;
  }
} 