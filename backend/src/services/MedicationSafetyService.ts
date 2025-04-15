import { IPatient } from '../models/Patient';
import { MedicationRepository } from '../repositories/MedicationRepository';
import logger from '../utils/logger';
import { IMedication } from '../models/Medication';

export interface SafetyCheckResult {
  isSafe: boolean;
  warnings: SafetyWarning[];
}

export interface SafetyWarning {
  type: 'ALLERGY' | 'INTERACTION' | 'CONTRAINDICATION' | 'PREGNANCY' | 'AGE_RESTRICTION' | 'OTHER';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  source?: string;
}

export interface PatientMedication {
  medicationId: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface AdherenceData {
  medicationId: string;
  medicationName: string;
  adherenceRate: number; // percentage
  missedDoses: number;
  lastTakenAt?: Date;
  nextDoseAt?: Date;
}

// Extend IPatient interface with properties needed for safety checks
interface PatientWithSafetyInfo extends IPatient {
  isPregnant?: boolean;
  conditions?: string[];
}

export class MedicationSafetyService {
  private static instance: MedicationSafetyService;
  private medicationRepository: MedicationRepository;
  
  private constructor() {
    this.medicationRepository = MedicationRepository.getInstance();
  }
  
  public static getInstance(): MedicationSafetyService {
    if (!MedicationSafetyService.instance) {
      MedicationSafetyService.instance = new MedicationSafetyService();
    }
    return MedicationSafetyService.instance;
  }
  
  async checkMedicationSafety(
    medicationId: string,
    patient: PatientWithSafetyInfo,
    currentMedications: PatientMedication[]
  ): Promise<SafetyCheckResult> {
    try {
      const medication = await this.medicationRepository.getMedicationById(medicationId);
      if (!medication) {
        return {
          isSafe: false,
          warnings: [{
            type: 'OTHER',
            severity: 'HIGH',
            description: 'Medication not found in the database'
          }]
        };
      }
      
      const warnings: SafetyWarning[] = [];
      
      // Check for allergies
      const allergyWarnings = this.checkAllergies(medication, patient);
      warnings.push(...allergyWarnings);
      
      // Check for interactions with current medications
      const interactionWarnings = await this.checkInteractions(medication, currentMedications);
      warnings.push(...interactionWarnings);
      
      // Check for contraindications
      const contraindicationWarnings = this.checkContraindications(medication, patient);
      warnings.push(...contraindicationWarnings);
      
      // Check for pregnancy safety
      if (patient.isPregnant) {
        const pregnancyWarnings = this.checkPregnancySafety(medication);
        warnings.push(...pregnancyWarnings);
      }
      
      // Check age restrictions
      if (patient.dateOfBirth) {
        const ageWarnings = this.checkAgeRestrictions(medication, patient.dateOfBirth);
        warnings.push(...ageWarnings);
      }
      
      // Determine overall safety
      const highSeverityWarnings = warnings.filter(w => w.severity === 'HIGH');
      const isSafe = highSeverityWarnings.length === 0;
      
      return {
        isSafe,
        warnings
      };
    } catch (error) {
      logger.error(`Error checking medication safety: ${error}`);
      return {
        isSafe: false,
        warnings: [{
          type: 'OTHER',
          severity: 'HIGH',
          description: 'An error occurred while checking medication safety'
        }]
      };
    }
  }
  
  private checkAllergies(medication: IMedication, patient: PatientWithSafetyInfo): SafetyWarning[] {
    const warnings: SafetyWarning[] = [];
    
    // In a real implementation, you would check the patient's allergies
    // against the medication's ingredients
    // For simplicity, we'll just return an empty array
    
    return warnings;
  }
  
  private async checkInteractions(
    medication: IMedication, 
    currentMedications: PatientMedication[]
  ): Promise<SafetyWarning[]> {
    const warnings: SafetyWarning[] = [];
    
    // In a real implementation, you would check for interactions between
    // the medication and the patient's current medications
    // For simplicity, we'll just return an empty array
    
    return warnings;
  }
  
  private checkContraindications(medication: IMedication, patient: PatientWithSafetyInfo): SafetyWarning[] {
    const warnings: SafetyWarning[] = [];
    
    if (!medication.contraindications || medication.contraindications.length === 0 || 
        !patient.conditions || patient.conditions.length === 0) {
      return warnings;
    }
    
    // Check if any patient conditions match contraindications
    const matchingContraindications = medication.contraindications.filter(contraindication => 
      patient.conditions!.some((condition: string) => 
        condition.toLowerCase().includes(contraindication.toLowerCase())
      )
    );
    
    // Add warnings for each matching contraindication
    for (const contraindication of matchingContraindications) {
      warnings.push({
        type: 'CONTRAINDICATION',
        severity: 'HIGH',
        description: `The medication is contraindicated for patients with ${contraindication}`
      });
    }
    
    return warnings;
  }
  
  private checkPregnancySafety(medication: IMedication): SafetyWarning[] {
    const warnings: SafetyWarning[] = [];
    
    // Pregnancy category D or X medications are not safe during pregnancy
    if (medication.pregnancyCategory === 'D' || medication.pregnancyCategory === 'X') {
      warnings.push({
        type: 'PREGNANCY',
        severity: 'HIGH',
        description: `This medication has pregnancy category ${medication.pregnancyCategory} and may harm the fetus`
      });
    } else if (medication.pregnancyCategory === 'C') {
      warnings.push({
        type: 'PREGNANCY',
        severity: 'MEDIUM',
        description: `This medication has pregnancy category C and should be used with caution during pregnancy`
      });
    }
    
    return warnings;
  }
  
  private checkAgeRestrictions(medication: IMedication, dateOfBirth: Date): SafetyWarning[] {
    const warnings: SafetyWarning[] = [];
    const age = this.calculateAge(dateOfBirth);
    
    // Check for pediatric use
    if (age < 18 && !medication.pediatricUse) {
      warnings.push({
        type: 'AGE_RESTRICTION',
        severity: 'HIGH',
        description: 'This medication is not approved for pediatric use'
      });
    }
    
    // Check for geriatric precautions
    if (age >= 65 && medication.geriatricPrecautions && medication.geriatricPrecautions.length > 0) {
      warnings.push({
        type: 'AGE_RESTRICTION',
        severity: 'MEDIUM',
        description: 'This medication should be used with caution in elderly patients'
      });
    }
    
    return warnings;
  }
  
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  }
  
  async trackAdherence(
    patientId: string,
    medications: PatientMedication[],
    medicationLogs: {
      medicationId: string;
      takenAt: Date;
      wasSkipped: boolean;
      reason?: string;
    }[]
  ): Promise<AdherenceData[]> {
    // In a real implementation, you would track the patient's adherence to medications
    // For simplicity, we'll just return a mock result
    
    const result: AdherenceData[] = [];
    
    for (const medication of medications) {
      const logs = medicationLogs.filter(log => log.medicationId === medication.medicationId);
      const takenLogs = logs.filter(log => !log.wasSkipped);
      
      const adherenceRate = logs.length > 0 ? Math.round((takenLogs.length / logs.length) * 100) : 100;
      
      result.push({
        medicationId: medication.medicationId,
        medicationName: 'Unknown', // In a real implementation, you would get the name from the medication
        adherenceRate,
        missedDoses: logs.length - takenLogs.length,
        lastTakenAt: takenLogs.length > 0 ? takenLogs[takenLogs.length - 1].takenAt : undefined,
        nextDoseAt: this.calculateNextDoseTime(
          takenLogs.length > 0 ? takenLogs[takenLogs.length - 1].takenAt : new Date(),
          medication.frequency
        )
      });
    }
    
    return result;
  }
  
  private calculateExpectedDoses(medication: PatientMedication): number {
    const now = new Date();
    const startDate = medication.startDate < now ? medication.startDate : now;
    const endDate = medication.endDate && medication.endDate < now ? medication.endDate : now;
    
    // Calculate days
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate doses based on frequency
    let dosesPerDay = 1;
    
    if (medication.frequency.includes('once')) {
      dosesPerDay = 1;
    } else if (medication.frequency.includes('twice') || medication.frequency.includes('two times')) {
      dosesPerDay = 2;
    } else if (medication.frequency.includes('three') || medication.frequency.includes('3 times')) {
      dosesPerDay = 3;
    } else if (medication.frequency.includes('four') || medication.frequency.includes('4 times')) {
      dosesPerDay = 4;
    } else if (medication.frequency.includes('hour')) {
      // For hourly medications, estimate based on waking hours (16 hours)
      const hourlyMatch = medication.frequency.match(/every\s+(\d+)\s+hours?/i);
      if (hourlyMatch && hourlyMatch[1]) {
        const hours = parseInt(hourlyMatch[1]);
        dosesPerDay = Math.floor(16 / hours);
      }
    } else if (medication.frequency.includes('weekly') || medication.frequency.includes('every week')) {
      dosesPerDay = 1 / 7;
    } else if (medication.frequency.includes('monthly') || medication.frequency.includes('every month')) {
      dosesPerDay = 1 / 30;
    }
    
    return Math.round(days * dosesPerDay);
  }
  
  private calculateNextDoseTime(lastDose: Date, frequency: string): Date | undefined {
    const nextDose = new Date(lastDose);
    
    if (frequency.includes('once daily') || frequency.includes('every day')) {
      nextDose.setDate(nextDose.getDate() + 1);
    } else if (frequency.includes('twice daily') || frequency.includes('two times a day')) {
      nextDose.setHours(nextDose.getHours() + 12);
    } else if (frequency.includes('three times a day')) {
      nextDose.setHours(nextDose.getHours() + 8);
    } else if (frequency.includes('four times a day')) {
      nextDose.setHours(nextDose.getHours() + 6);
    } else if (frequency.includes('hour')) {
      const hourlyMatch = frequency.match(/every\s+(\d+)\s+hours?/i);
      if (hourlyMatch && hourlyMatch[1]) {
        const hours = parseInt(hourlyMatch[1]);
        nextDose.setHours(nextDose.getHours() + hours);
      } else {
        return undefined;
      }
    } else if (frequency.includes('weekly') || frequency.includes('every week')) {
      nextDose.setDate(nextDose.getDate() + 7);
    } else if (frequency.includes('monthly') || frequency.includes('every month')) {
      nextDose.setMonth(nextDose.getMonth() + 1);
    } else {
      return undefined;
    }
    
    return nextDose;
  }
} 