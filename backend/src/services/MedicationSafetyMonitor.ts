import { cacheService } from './cache';
import logger from '../utils/logger';
import mongoose from 'mongoose';
import { MedicationRepository } from '../repositories/MedicationRepository';
import { PrescriptionSuggestion, PrescriptionStatus } from './ai/PrescriptionSuggestionService';
import { DrugInteractionService } from './ai/DrugInteractionService';
import { InteractionSeverity, DrugInteractionRisk } from './ai/PrescriptionSuggestionService';
import { PatientRepository } from '../repositories/PatientRepository';
import User, { IUser } from '../models/User';
import { IMedication } from '../models/Medication';

/**
 * Types of medication safety issues that can be reported
 */
export enum SafetyIssueType {
  ADVERSE_REACTION = 'adverse_reaction',
  INTERACTION = 'interaction',
  INCORRECT_DOSAGE = 'incorrect_dosage',
  CONTRAINDICATION = 'contraindication',
  ALLERGY = 'allergy',
  MEDICATION_ERROR = 'medication_error',
  SIDE_EFFECT = 'side_effect',
  OTHER = 'other'
}

/**
 * Severity levels for medication safety issues
 */
export enum IssueSeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  LIFE_THREATENING = 'life_threatening'
}

/**
 * Status of a reported safety issue
 */
export enum IssueStatus {
  REPORTED = 'reported',
  UNDER_INVESTIGATION = 'under_investigation',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

/**
 * Interface for a medication safety issue report
 */
export interface SafetyIssueReport {
  id: string;
  patientId: string;
  providerId?: string;
  medications: string[];
  issueType: SafetyIssueType;
  severity: IssueSeverity;
  description: string;
  symptoms: string[];
  reportDate: Date;
  status: IssueStatus;
  resolution?: string;
  resolvedDate?: Date;
  relatedPrescriptionIds?: string[];
}

/**
 * Interface for medication usage statistics
 */
export interface MedicationUsageStats {
  medicationName: string;
  totalPrescriptions: number;
  adverseEvents: number;
  commonSideEffects: {
    symptom: string;
    count: number;
    percentageOfUsers: number;
  }[];
  interactionFrequency: {
    interactingMedication: string;
    count: number;
    percentageOfUsers: number;
  }[];
  lastUpdated: Date;
}

export interface PatientMedication {
  id: string;
  name: string;
  genericName?: string;
  drugClass?: string[];
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  lastTaken?: Date;
  nextDoseDue?: Date;
  adherenceRate?: number;
}

export interface MedicationAlert {
  id: string;
  patientId: string;
  medicationId: string;
  medicationName: string;
  alertType: 'interaction' | 'allergy' | 'adherence' | 'duplicate' | 'contraindication';
  severity: 'high' | 'medium' | 'low';
  message: string;
  details?: any;
  createdAt: Date;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

export interface PatientAllergy {
  substance: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
  verified: boolean;
}

export interface MedicationSafetyReport {
  patientId: string;
  medications: PatientMedication[];
  alerts: MedicationAlert[];
  adherenceScore: number;
  interactionRisks: DrugInteractionRisk[];
  potentialAllergies: {
    medication: string;
    allergen: string;
    severity: string;
  }[];
  recommendations: string[];
}

/**
 * Types of alerts that the safety monitor can generate
 */
export enum AlertType {
  HIGH_RISK_INTERACTION = 'HIGH_RISK_INTERACTION',
  CONTRAINDICATION = 'CONTRAINDICATION',
  DOSAGE_ISSUE = 'DOSAGE_ISSUE',
  ALLERGY_DETECTED = 'ALLERGY_DETECTED',
  BLACK_BOX_WARNING = 'BLACK_BOX_WARNING'
}

/**
 * Structure of a safety alert
 */
export interface SafetyAlert {
  type: AlertType;
  severity: InteractionSeverity;
  message: string;
  medications: string[];
  patientId?: string;
  recommendedAction?: string;
  timestamp: Date;
}

/**
 * Service for monitoring medication safety and generating alerts
 */
export class MedicationSafetyMonitor {
  private static instance: MedicationSafetyMonitor;
  private safetyIssues: Map<string, SafetyIssueReport> = new Map();
  private medicationStats: Map<string, MedicationUsageStats> = new Map();
  private initialized = false;
  private readonly CACHE_TTL = 86400; // 24 hours
  private medicationRepo: MedicationRepository;
  private patientRepo: PatientRepository;
  private interactionService: DrugInteractionService;

  private constructor() {
    this.medicationRepo = MedicationRepository.getInstance();
    this.patientRepo = PatientRepository.getInstance();
    this.interactionService = DrugInteractionService.getInstance();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): MedicationSafetyMonitor {
    if (!MedicationSafetyMonitor.instance) {
      MedicationSafetyMonitor.instance = new MedicationSafetyMonitor();
    }
    return MedicationSafetyMonitor.instance;
  }

  /**
   * Initialize the monitoring service
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.medicationRepo.initialize();
      
      // Load cached data if available
      const cachedIssues = await cacheService.get<SafetyIssueReport[]>('safety_issues');
      const cachedStats = await cacheService.get<MedicationUsageStats[]>('medication_stats');
      
      if (cachedIssues) {
        this.safetyIssues.clear();
        for (const issue of cachedIssues) {
          this.safetyIssues.set(issue.id, issue);
        }
      }
      
      if (cachedStats) {
        this.medicationStats.clear();
        for (const stat of cachedStats) {
          this.medicationStats.set(stat.medicationName, stat);
        }
      }
      
      // Load from database if needed
      if (!cachedIssues || !cachedStats) {
        await this.loadFromDatabase();
      }
      
      this.initialized = true;
      logger.info('Medication safety monitor initialized');
    } catch (error) {
      logger.error('Failed to initialize medication safety monitor', error);
      // Initialize with empty data
      this.initialized = true;
    }
  }

  /**
   * Report a new medication safety issue
   */
  public async reportSafetyIssue(issue: Omit<SafetyIssueReport, 'id' | 'reportDate' | 'status'>): Promise<SafetyIssueReport> {
    await this.ensureInitialized();
    
    const newIssue: SafetyIssueReport = {
      ...issue,
      id: new mongoose.Types.ObjectId().toString(),
      reportDate: new Date(),
      status: IssueStatus.REPORTED
    };
    
    this.safetyIssues.set(newIssue.id, newIssue);
    await this.persistSafetyIssues();
    await this.updateMedicationStats();
    
    this.alertOnSeriousIssue(newIssue);
    
    return newIssue;
  }

  /**
   * Update the status of a safety issue
   */
  public async updateIssueStatus(issueId: string, status: IssueStatus, resolution?: string): Promise<SafetyIssueReport | null> {
    await this.ensureInitialized();
    
    const issue = this.safetyIssues.get(issueId);
    if (!issue) return null;
    
    const updatedIssue: SafetyIssueReport = {
      ...issue,
      status,
      resolution: resolution || issue.resolution
    };
    
    if (status === IssueStatus.RESOLVED) {
      updatedIssue.resolvedDate = new Date();
    }
    
    this.safetyIssues.set(issueId, updatedIssue);
    await this.persistSafetyIssues();
    
    return updatedIssue;
  }

  /**
   * Get safety issues for a specific patient
   */
  public async getPatientSafetyIssues(patientId: string): Promise<SafetyIssueReport[]> {
    await this.ensureInitialized();
    
    return Array.from(this.safetyIssues.values())
      .filter(issue => issue.patientId === patientId)
      .sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime());
  }

  /**
   * Get all safety issues related to a specific medication
   */
  public async getMedicationSafetyIssues(medicationName: string): Promise<SafetyIssueReport[]> {
    await this.ensureInitialized();
    
    const normalizedMed = medicationName.toLowerCase();
    
    return Array.from(this.safetyIssues.values())
      .filter(issue => 
        issue.medications.some(med => med.toLowerCase().includes(normalizedMed) || normalizedMed.includes(med.toLowerCase()))
      )
      .sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime());
  }

  /**
   * Get usage statistics for a specific medication
   */
  public async getMedicationStats(medicationName: string): Promise<MedicationUsageStats | null> {
    await this.ensureInitialized();
    
    // Try exact match first
    const exactStats = this.medicationStats.get(medicationName);
    if (exactStats) return exactStats;
    
    // Try case-insensitive match
    const lowerName = medicationName.toLowerCase();
    for (const [name, stats] of this.medicationStats.entries()) {
      if (name.toLowerCase() === lowerName) {
        return stats;
      }
    }
    
    // Try partial match
    for (const [name, stats] of this.medicationStats.entries()) {
      if (name.toLowerCase().includes(lowerName) || lowerName.includes(name.toLowerCase())) {
        return stats;
      }
    }
    
    return null;
  }

  /**
   * Check if a prescription has potential safety issues
   */
  public async evaluatePrescriptionSafety(
    prescriptionId: string,
    medications: string[],
    patientId: string
  ): Promise<{ isSafe: boolean; warnings: string[]; relatedIssues: SafetyIssueReport[] }> {
    await this.ensureInitialized();
    
    const warnings: string[] = [];
    const relatedIssues: SafetyIssueReport[] = [];
    
    // Check for existing safety issues with these medications for this patient
    const patientIssues = await this.getPatientSafetyIssues(patientId);
    
    for (const medication of medications) {
      // Find issues related to this medication for this patient
      const medicationIssues = patientIssues.filter(issue => 
        issue.medications.some(med => 
          med.toLowerCase() === medication.toLowerCase() || 
          med.toLowerCase().includes(medication.toLowerCase()) ||
          medication.toLowerCase().includes(med.toLowerCase())
        )
      );
      
      if (medicationIssues.length > 0) {
        for (const issue of medicationIssues) {
          if (!relatedIssues.some(ri => ri.id === issue.id)) {
            relatedIssues.push(issue);
          }
          
          if (issue.status !== IssueStatus.DISMISSED) {
            warnings.push(`Previous ${issue.issueType} reported for ${medication} (${issue.severity})`);
          }
        }
      }
      
      // Check medication statistics for common issues
      const stats = await this.getMedicationStats(medication);
      if (stats && stats.adverseEvents > 0) {
        const adverseEventRate = (stats.adverseEvents / stats.totalPrescriptions) * 100;
        if (adverseEventRate > 10) {
          warnings.push(`High adverse event rate (${adverseEventRate.toFixed(1)}%) for ${medication}`);
        }
        
        // Add most common side effects as warnings
        const commonSideEffects = stats.commonSideEffects
          .filter(se => se.percentageOfUsers > 5)
          .map(se => se.symptom);
        
        if (commonSideEffects.length > 0) {
          warnings.push(`Common side effects of ${medication}: ${commonSideEffects.join(', ')}`);
        }
      }
    }
    
    // Add prescription ID to related issues
    await Promise.all(
      relatedIssues.map(issue => {
        if (!issue.relatedPrescriptionIds) {
          issue.relatedPrescriptionIds = [prescriptionId];
        } else if (!issue.relatedPrescriptionIds.includes(prescriptionId)) {
          issue.relatedPrescriptionIds.push(prescriptionId);
        }
        return this.updateIssueStatus(issue.id, issue.status, issue.resolution);
      })
    );
    
    return {
      isSafe: warnings.length === 0,
      warnings,
      relatedIssues
    };
  }

  /**
   * Record that a prescription has been fulfilled
   * Used for medication usage statistics
   */
  public async recordPrescriptionFulfilled(
    medications: string[],
    patientId: string
  ): Promise<void> {
    await this.ensureInitialized();
    
    for (const medication of medications) {
      // Update medication statistics
      let stats = this.medicationStats.get(medication);
      
      if (!stats) {
        stats = {
          medicationName: medication,
          totalPrescriptions: 0,
          adverseEvents: 0,
          commonSideEffects: [],
          interactionFrequency: [],
          lastUpdated: new Date()
        };
      }
      
      stats.totalPrescriptions += 1;
      stats.lastUpdated = new Date();
      
      this.medicationStats.set(medication, stats);
    }
    
    await this.persistMedicationStats();
    logger.info(`Recorded prescription fulfillment for patient ${patientId}`);
  }

  /**
   * Process safe prescriptions
   * Used for tracking AI system performance
   */
  public async trackPrescriptionSafety(
    suggestions: PrescriptionSuggestion[],
    patientId: string,
    diagnosisId: string
  ): Promise<{ safeCount: number; reviewCount: number; rejectedCount: number }> {
    let safeCount = 0;
    let reviewCount = 0;
    let rejectedCount = 0;
    
    for (const suggestion of suggestions) {
      switch (suggestion.status) {
        case PrescriptionStatus.APPROVED:
          safeCount++;
          break;
        case PrescriptionStatus.REQUIRES_REVIEW:
          reviewCount++;
          break;
        case PrescriptionStatus.REJECTED:
          rejectedCount++;
          break;
        default:
          // Count pending as needing review
          reviewCount++;
      }
    }
    
    // Record these statistics for AI system performance tracking
    await this.recordAIPerformanceMetrics(safeCount, reviewCount, rejectedCount, diagnosisId);
    
    return { safeCount, reviewCount, rejectedCount };
  }

  /**
   * Generate a safety report for a time period
   */
  public async generateSafetyStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalIssues: number;
    issuesByType: Record<SafetyIssueType, number>;
    issuesBySeverity: Record<IssueSeverity, number>;
    medicationsWithMostIssues: Array<{ medication: string; count: number }>;
    resolvedIssueRate: number;
  }> {
    await this.ensureInitialized();
    
    const issues = Array.from(this.safetyIssues.values()).filter(
      issue => issue.reportDate >= startDate && issue.reportDate <= endDate
    );
    
    const issuesByType: Record<SafetyIssueType, number> = {
      [SafetyIssueType.ADVERSE_REACTION]: 0,
      [SafetyIssueType.INTERACTION]: 0,
      [SafetyIssueType.INCORRECT_DOSAGE]: 0,
      [SafetyIssueType.CONTRAINDICATION]: 0,
      [SafetyIssueType.ALLERGY]: 0,
      [SafetyIssueType.MEDICATION_ERROR]: 0,
      [SafetyIssueType.SIDE_EFFECT]: 0,
      [SafetyIssueType.OTHER]: 0
    };
    
    const issuesBySeverity: Record<IssueSeverity, number> = {
      [IssueSeverity.MILD]: 0,
      [IssueSeverity.MODERATE]: 0,
      [IssueSeverity.SEVERE]: 0,
      [IssueSeverity.LIFE_THREATENING]: 0
    };
    
    const medicationCounts: Record<string, number> = {};
    let resolvedCount = 0;
    
    for (const issue of issues) {
      issuesByType[issue.issueType]++;
      issuesBySeverity[issue.severity]++;
      
      if (issue.status === IssueStatus.RESOLVED) {
        resolvedCount++;
      }
      
      for (const medication of issue.medications) {
        medicationCounts[medication] = (medicationCounts[medication] || 0) + 1;
      }
    }
    
    // Sort medications by issue count
    const medicationsWithMostIssues = Object.entries(medicationCounts)
      .map(([medication, count]) => ({ medication, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalIssues: issues.length,
      issuesByType,
      issuesBySeverity,
      medicationsWithMostIssues,
      resolvedIssueRate: issues.length > 0 ? (resolvedCount / issues.length) * 100 : 0
    };
  }

  /**
   * Ensure the service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Load data from the database
   */
  private async loadFromDatabase(): Promise<void> {
    // In a real implementation, this would load from MongoDB
    // For now, we'll just initialize with empty data
    this.safetyIssues.clear();
    this.medicationStats.clear();
    
    // Cache the data
    await this.persistSafetyIssues();
    await this.persistMedicationStats();
  }

  /**
   * Persist safety issues to cache and database
   */
  private async persistSafetyIssues(): Promise<void> {
    const issues = Array.from(this.safetyIssues.values());
    await cacheService.set('safety_issues', issues, this.CACHE_TTL);
    
    // In a real implementation, this would also save to MongoDB
    logger.info(`Persisted ${issues.length} safety issues to cache`);
  }

  /**
   * Persist medication statistics to cache and database
   */
  private async persistMedicationStats(): Promise<void> {
    const stats = Array.from(this.medicationStats.values());
    await cacheService.set('medication_stats', stats, this.CACHE_TTL);
    
    // In a real implementation, this would also save to MongoDB
    logger.info(`Persisted ${stats.length} medication statistics to cache`);
  }

  /**
   * Alert on serious issues
   */
  private alertOnSeriousIssue(issue: SafetyIssueReport): void {
    if (issue.severity === IssueSeverity.SEVERE || issue.severity === IssueSeverity.LIFE_THREATENING) {
      logger.warn(`Serious medication issue reported: ${issue.issueType} - ${issue.severity}`, {
        issueId: issue.id,
        patientId: issue.patientId,
        medications: issue.medications,
        symptoms: issue.symptoms
      });
      
      // In a real implementation, this could send notifications to providers
      // or integrate with an alerting system
    }
  }

  /**
   * Update medication statistics based on safety issues
   */
  private async updateMedicationStats(): Promise<void> {
    const allIssues = Array.from(this.safetyIssues.values());
    const medicationIssueMap: Record<string, SafetyIssueReport[]> = {};
    
    // Group issues by medication
    for (const issue of allIssues) {
      for (const medication of issue.medications) {
        if (!medicationIssueMap[medication]) {
          medicationIssueMap[medication] = [];
        }
        medicationIssueMap[medication].push(issue);
      }
    }
    
    // Update stats for each medication
    for (const [medication, issues] of Object.entries(medicationIssueMap)) {
      let stats = this.medicationStats.get(medication);
      
      if (!stats) {
        stats = {
          medicationName: medication,
          totalPrescriptions: Math.max(issues.length * 10, 100), // Estimate total based on issues
          adverseEvents: 0,
          commonSideEffects: [],
          interactionFrequency: [],
          lastUpdated: new Date()
        };
      }
      
      // Count adverse events
      stats.adverseEvents = issues.filter(issue => 
        issue.issueType === SafetyIssueType.ADVERSE_REACTION || 
        issue.issueType === SafetyIssueType.SIDE_EFFECT
      ).length;
      
      // Track common side effects
      const symptomCount: Record<string, number> = {};
      for (const issue of issues) {
        if (
          issue.issueType === SafetyIssueType.ADVERSE_REACTION || 
          issue.issueType === SafetyIssueType.SIDE_EFFECT
        ) {
          for (const symptom of issue.symptoms) {
            symptomCount[symptom] = (symptomCount[symptom] || 0) + 1;
          }
        }
      }
      
      stats.commonSideEffects = Object.entries(symptomCount)
        .map(([symptom, count]) => ({
          symptom,
          count,
          percentageOfUsers: (count / stats.totalPrescriptions) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Track interaction frequency
      const interactionCount: Record<string, number> = {};
      for (const issue of issues) {
        if (issue.issueType === SafetyIssueType.INTERACTION) {
          for (const med of issue.medications) {
            if (med !== medication) {
              interactionCount[med] = (interactionCount[med] || 0) + 1;
            }
          }
        }
      }
      
      stats.interactionFrequency = Object.entries(interactionCount)
        .map(([interactingMedication, count]) => ({
          interactingMedication,
          count,
          percentageOfUsers: (count / stats.totalPrescriptions) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      stats.lastUpdated = new Date();
      this.medicationStats.set(medication, stats);
    }
    
    await this.persistMedicationStats();
  }

  /**
   * Record AI performance metrics
   */
  private async recordAIPerformanceMetrics(
    safeCount: number,
    reviewCount: number,
    rejectedCount: number,
    diagnosisId: string
  ): Promise<void> {
    // In a real implementation, this would record metrics to a database
    // for tracking AI system performance over time
    logger.info(`AI prescription performance: ${safeCount} safe, ${reviewCount} need review, ${rejectedCount} rejected`, {
      diagnosisId,
      safeRate: safeCount / (safeCount + reviewCount + rejectedCount)
    });
  }

  /**
   * Check for interactions between medications
   */
  private async checkInteractions(medicationIds: string[]): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];
    const medications: IMedication[] = [];

    // Get all medications
    for (const id of medicationIds) {
      const medication = await this.medicationRepo.getMedicationById(id);
      if (medication) {
        medications.push(medication);
      }
    }

    // Check each medication against every other medication
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i];
        const med2 = medications[j];
        
        // Use the DrugInteractionService for checking interactions
        const interactionRisks = await this.interactionService.checkInteractions(
          med1.name, 
          [med2.name]
        );
        
        // Process each interaction risk
        for (const risk of interactionRisks) {
          if (risk.severity === InteractionSeverity.HIGH) {
            alerts.push({
              type: AlertType.HIGH_RISK_INTERACTION,
              severity: risk.severity,
              message: `Potential ${risk.severity.toLowerCase()} interaction between ${med1.name} and ${med2.name}: ${risk.description}`,
              medications: [med1._id.toString(), med2._id.toString()],
              recommendedAction: this.getRecommendationForInteraction(risk),
              timestamp: new Date()
            });
          }
        }
      }
    }

    return alerts;
  }

  /**
   * Check for allergies to medications
   */
  private async checkAllergies(medicationIds: string[], allergies: string[]): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];
    const normalizedAllergies = allergies.map(a => a.toLowerCase().trim());

    for (const id of medicationIds) {
      const medication = await this.medicationRepo.getMedicationById(id);
      if (!medication) continue;

      // Check if medication name or generic name is in allergies
      const medName = medication.name.toLowerCase();
      const genericName = medication.genericName?.toLowerCase() || '';
      
      const allergyMatch = normalizedAllergies.find(
        allergy => medName.includes(allergy) || genericName.includes(allergy) ||
        // Also check if this medication is in the same class as an allergy
        (medication.drugClass && medication.drugClass.some((cls: string) => 
          cls.toLowerCase().includes(allergy)
        ))
      );
      
      if (allergyMatch) {
        alerts.push({
          type: AlertType.ALLERGY_DETECTED,
          severity: InteractionSeverity.HIGH,
          message: `Patient has a documented allergy to ${allergyMatch}, which may affect ${medication.name}`,
          medications: [id],
          recommendedAction: `Consider alternative medication. Verify with patient if this is a true allergy or intolerance.`,
          timestamp: new Date()
        });
      }
    }

    return alerts;
  }

  /**
   * Check for contraindications based on patient conditions
   */
  private async checkContraindications(medicationIds: string[], conditions: string[]): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];
    const normalizedConditions = conditions.map(c => c.toLowerCase().trim());

    for (const id of medicationIds) {
      const medication = await this.medicationRepo.getMedicationById(id);
      if (!medication || !medication.contraindications) continue;

      for (const contraindication of medication.contraindications) {
        const condition = contraindication.toLowerCase();
        
        // Check if any patient condition matches this contraindication
        const match = normalizedConditions.find(c => condition.includes(c) || c.includes(condition));
        
        if (match) {
          alerts.push({
            type: AlertType.CONTRAINDICATION,
            severity: InteractionSeverity.HIGH,
            message: `${medication.name} is contraindicated for patients with ${match}`,
            medications: [id],
            recommendedAction: `Consider alternative medication. Consult with specialist if necessary.`,
            timestamp: new Date()
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Check for black box warnings on medications
   */
  private async checkBlackBoxWarnings(medicationIds: string[]): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    for (const id of medicationIds) {
      const medication = await this.medicationRepo.getMedicationById(id);
      if (!medication || !medication.blackBoxWarning) continue;

      alerts.push({
        type: AlertType.BLACK_BOX_WARNING,
        severity: InteractionSeverity.HIGH,
        message: `${medication.name} has a black box warning: ${medication.blackBoxWarning}`,
        medications: [id],
        recommendedAction: `Ensure patient is informed of risks. Consider monitoring plan.`,
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * Get a recommendation based on interaction severity
   */
  private getRecommendationForInteraction(risk: DrugInteractionRisk): string {
    switch (risk.severity) {
      case InteractionSeverity.HIGH:
        return `Avoid combination. Consider alternative medication.`;
      case InteractionSeverity.LOW:
        return `Be aware of potential interaction. Monitor for side effects.`;
      default:
        return `No specific recommendation required.`;
    }
  }

  /**
   * Log a safety alert to the system
   */
  async logSafetyAlert(alert: SafetyAlert): Promise<void> {
    logger.warn(`MEDICATION SAFETY ALERT: ${alert.type} - ${alert.message}`);
    // In a real implementation, this would also save to a database and potentially notify appropriate staff
  }

  /**
   * Check medication safety with all applicable checks
   */
  async checkMedicationSafety(
    medicationIds: string[],
    patientId?: string,
    patientAllergies?: string[],
    patientConditions?: string[]
  ): Promise<SafetyAlert[]> {
    try {
      const alerts: SafetyAlert[] = [];
      
      // Check for interactions between medications
      const interactionAlerts = await this.checkInteractions(medicationIds);
      alerts.push(...interactionAlerts);

      // If patient information is provided, perform additional checks
      if (patientId) {
        // Check for allergies
        if (patientAllergies && patientAllergies.length > 0) {
          const allergyAlerts = await this.checkAllergies(medicationIds, patientAllergies);
          alerts.push(...allergyAlerts);
        }

        // Check for contraindications based on patient conditions
        if (patientConditions && patientConditions.length > 0) {
          const contraindications = await this.checkContraindications(medicationIds, patientConditions);
          alerts.push(...contraindications);
        }
      }

      // Check for black box warnings
      const blackBoxAlerts = await this.checkBlackBoxWarnings(medicationIds);
      alerts.push(...blackBoxAlerts);

      return alerts;
    } catch (error) {
      logger.error(`Error checking medication safety: ${error}`);
      return [];
    }
  }

  /**
   * Generate a safety report for a specific patient
   */
  async generatePatientSafetyReport(patientId: string): Promise<MedicationSafetyReport | null> {
    try {
      // Get patient's active medications
      const patient = await this.patientRepo.getPatientById(patientId);
      
      if (!patient) {
        logger.warn(`Patient not found: ${patientId}`);
        return null;
      }
      
      const medications: PatientMedication[] = await this.getPatientMedications(patientId);
      
      if (!medications.length) {
        return {
          patientId,
          medications: [],
          alerts: [],
          adherenceScore: 100, // No medications = 100% adherence
          interactionRisks: [],
          potentialAllergies: [],
          recommendations: ['No active medications to evaluate.']
        };
      }
      
      // Check interactions
      const interactionRisks = await this.checkMedicationInteractions(medications);
      
      // Check allergies
      const potentialAllergies = await this.checkPatientAllergies(patientId, medications);
      
      // Calculate adherence
      const adherenceScore = this.calculateAdherenceScore(medications);
      
      // Generate alerts
      const alerts = await this.generateAlerts(
        patientId,
        medications,
        interactionRisks,
        potentialAllergies
      );
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        medications,
        interactionRisks,
        potentialAllergies,
        adherenceScore
      );
      
      return {
        patientId,
        medications,
        alerts,
        adherenceScore,
        interactionRisks,
        potentialAllergies,
        recommendations
      };
    } catch (error) {
      logger.error(`Error generating safety report: ${error}`);
      return null;
    }
  }

  // Helper methods should remain intact
  private async getPatientMedications(patientId: string): Promise<PatientMedication[]> {
    // Implementation would be based on your actual data models
    // This is a placeholder
    return [];
  }

  private async checkMedicationInteractions(medications: PatientMedication[]): Promise<DrugInteractionRisk[]> {
    // Implementation would depend on your DrugInteractionService
    // This is a placeholder
    return [];
  }

  private async checkPatientAllergies(
    patientId: string, 
    medications: PatientMedication[]
  ): Promise<{ medication: string; allergen: string; severity: string }[]> {
    // Implementation would depend on your patient and allergy models
    // This is a placeholder
    return [];
  }

  private generateAlerts(
    patientId: string,
    medications: PatientMedication[],
    interactionRisks: DrugInteractionRisk[],
    potentialAllergies: { medication: string; allergen: string; severity: string }[]
  ): Promise<MedicationAlert[]> {
    // This would need to be implemented based on your alert models
    // This is a placeholder
    return Promise.resolve([]);
  }

  private findMedicationIdByName(medications: PatientMedication[], name: string): string {
    const medication = medications.find(med => 
      med.name.toLowerCase() === name.toLowerCase()
    );
    return medication ? medication.id : '';
  }

  private generateRecommendations(
    medications: PatientMedication[],
    interactionRisks: DrugInteractionRisk[],
    potentialAllergies: { medication: string; allergen: string; severity: string }[],
    adherenceScore: number
  ): string[] {
    // Implementation would generate recommendations based on the data
    // This is a placeholder
    return [];
  }

  private calculateAdherenceScore(medications: PatientMedication[]): number {
    // Calculate adherence score based on medication history
    // This is a placeholder
    return 100;
  }
}

// Export singleton instance
export const medicationSafetyMonitor = MedicationSafetyMonitor.getInstance(); 