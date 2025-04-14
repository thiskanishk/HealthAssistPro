import { cacheService } from '../services/cache';

export const cachePatterns = {
  userProfile: (userId: string) => `user:${userId}:profile`,
  patientList: (doctorId: string) => `doctor:${doctorId}:patients`,
  medicalHistory: (patientId: string) => `patient:${patientId}:history`,
  appointments: (userId: string) => `user:${userId}:appointments`,
  diagnoses: (patientId: string) => `patient:${patientId}:diagnoses`
};

export const invalidateCache = {
  userProfile: async (userId: string) => {
    await cacheService.invalidatePattern(`user:${userId}:*`);
  },
  
  patientData: async (patientId: string) => {
    await cacheService.invalidatePattern(`patient:${patientId}:*`);
  },
  
  doctorData: async (doctorId: string) => {
    await cacheService.invalidatePattern(`doctor:${doctorId}:*`);
  }
}; 