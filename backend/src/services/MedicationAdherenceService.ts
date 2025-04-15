import mongoose, { Model } from 'mongoose';
import logger from '../utils/logger';

// Custom error types for better error handling
export class AdherenceServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdherenceServiceError';
  }
}

export class AdherenceDataNotFoundError extends AdherenceServiceError {
  constructor(message: string) {
    super(message);
    this.name = 'AdherenceDataNotFoundError';
  }
}

// Interfaces
export interface MedicationSchedule {
  medicationId: mongoose.Types.ObjectId;
  medicationName: string;
  dosage: string;
  frequency: string;
  timeOfDay: string[];
  startDate: Date;
  endDate?: Date;
  instructions?: string;
  refillRemindDays: number;
  active: boolean;
}

export interface MedicationEvent {
  medicationId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  scheduleId: mongoose.Types.ObjectId;
  timestamp: Date;
  taken: boolean;
  delayed?: boolean;
  skipped: boolean;
  reason?: string;
}

export interface AdherenceMetrics {
  patientId: mongoose.Types.ObjectId;
  medicationId: mongoose.Types.ObjectId;
  overallAdherence: number;
  missedDoses: number;
  delayedDoses: number;
  periodicAdherence: {
    period: 'daily' | 'weekly' | 'monthly';
    data: Array<{
      date: Date;
      adherenceRate: number;
    }>;
  };
  trends: {
    improving: boolean;
    significantMissedPatterns?: {
      dayOfWeek?: string;
      timeOfDay?: string;
      frequency?: number;
    }[];
  };
}

export interface AdherenceAlert {
  patientId: mongoose.Types.ObjectId;
  medicationId: mongoose.Types.ObjectId;
  type: 'MISSED_DOSE' | 'CRITICAL_MISSED_DOSE' | 'DECLINING_ADHERENCE' | 'REFILL_NEEDED';
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: Date;
  acknowledged: boolean;
}

// MongoDB model interfaces
export interface IMedicationScheduleModel extends Model<MedicationSchedule> {}
export interface IMedicationEventModel extends Model<MedicationEvent> {}
export interface IAdherenceAlertModel extends Model<AdherenceAlert> {}

export class MedicationAdherenceService {
  private static instance: MedicationAdherenceService;

  // MongoDB models with proper types
  constructor(
    private medicationScheduleModel: IMedicationScheduleModel,
    private medicationEventModel: IMedicationEventModel,
    private adherenceAlertModel: IAdherenceAlertModel
  ) {}

  /**
   * Get singleton instance
   */
  public static getInstance(
    medicationScheduleModel: IMedicationScheduleModel,
    medicationEventModel: IMedicationEventModel,
    adherenceAlertModel: IAdherenceAlertModel
  ): MedicationAdherenceService {
    if (!MedicationAdherenceService.instance) {
      MedicationAdherenceService.instance = new MedicationAdherenceService(
        medicationScheduleModel,
        medicationEventModel, 
        adherenceAlertModel
      );
    }
    return MedicationAdherenceService.instance;
  }

  /**
   * Creates a new medication schedule for a patient
   */
  async createMedicationSchedule(patientId: mongoose.Types.ObjectId, schedule: Omit<MedicationSchedule, 'active'>): Promise<MedicationSchedule> {
    try {
      const newSchedule = await this.medicationScheduleModel.create({
        ...schedule,
        patientId,
        active: true
      });
      
      logger.info(`Created medication schedule for patient ${patientId} for medication ${schedule.medicationName}`);
      return newSchedule;
    } catch (error) {
      logger.error(`Failed to create medication schedule: ${error}`);
      throw new AdherenceServiceError(`Failed to create medication schedule: ${error}`);
    }
  }

  /**
   * Records a medication event (taken, missed, skipped)
   */
  async recordMedicationEvent(event: Omit<MedicationEvent, 'timestamp'>): Promise<MedicationEvent> {
    try {
      const medicationEvent = await this.medicationEventModel.create({
        ...event,
        timestamp: new Date()
      });

      // If medication was missed or skipped, check if we need to send an alert
      if (event.skipped || !event.taken) {
        await this.checkForAdherenceAlerts(event.patientId, event.medicationId);
      }

      logger.info(`Recorded medication event for patient ${event.patientId} for medication ${event.medicationId}`);
      return medicationEvent;
    } catch (error) {
      logger.error(`Failed to record medication event: ${error}`);
      throw new AdherenceServiceError(`Failed to record medication event: ${error}`);
    }
  }

  /**
   * Calculates medication adherence metrics for a patient
   */
  async calculateAdherenceMetrics(patientId: mongoose.Types.ObjectId, medicationId?: mongoose.Types.ObjectId, timeframe?: { start: Date; end: Date }): Promise<AdherenceMetrics[]> {
    try {
      // Build query
      const query: { patientId: mongoose.Types.ObjectId; medicationId?: mongoose.Types.ObjectId; timestamp?: { $gte: Date; $lte: Date } } = { patientId };
      if (medicationId) query.medicationId = medicationId;
      if (timeframe) {
        query.timestamp = {
          $gte: timeframe.start,
          $lte: timeframe.end || new Date()
        };
      }

      // Get all medication events for this patient/medication
      const events = await this.medicationEventModel.find(query).sort({ timestamp: 1 });
      
      // If no events, return empty metrics
      if (events.length === 0) {
        logger.info(`No medication events found for patient ${patientId}`);
        return [];
      }

      // Group events by medication
      const medicationGroups = this.groupEventsByMedication(events);
      
      // Calculate metrics for each medication
      const adherenceMetrics: AdherenceMetrics[] = [];
      
      for (const [medId, medEvents] of Object.entries(medicationGroups)) {
        const metrics = this.computeMetricsForMedication(
          patientId, 
          new mongoose.Types.ObjectId(medId), 
          medEvents, 
          timeframe
        );
        adherenceMetrics.push(metrics);
      }

      return adherenceMetrics;
    } catch (error) {
      logger.error(`Failed to calculate adherence metrics: ${error}`);
      throw new AdherenceServiceError(`Failed to calculate adherence metrics: ${error}`);
    }
  }

  /**
   * Gets active medication alerts for a patient
   */
  async getAdherenceAlerts(patientId: mongoose.Types.ObjectId, acknowledged: boolean = false): Promise<AdherenceAlert[]> {
    try {
      const alerts = await this.adherenceAlertModel.find({
        patientId,
        acknowledged
      }).sort({ createdAt: -1, severity: -1 });

      return alerts;
    } catch (error) {
      logger.error(`Failed to get adherence alerts: ${error}`);
      throw new AdherenceServiceError(`Failed to get adherence alerts: ${error}`);
    }
  }

  /**
   * Acknowledges an adherence alert
   */
  async acknowledgeAlert(alertId: mongoose.Types.ObjectId): Promise<boolean> {
    try {
      const result = await this.adherenceAlertModel.updateOne(
        { _id: alertId },
        { acknowledged: true }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      logger.error(`Failed to acknowledge alert: ${error}`);
      throw new AdherenceServiceError(`Failed to acknowledge alert: ${error}`);
    }
  }

  /**
   * Gets all medication schedules for a patient
   */
  async getPatientMedicationSchedules(patientId: mongoose.Types.ObjectId, activeOnly: boolean = true): Promise<MedicationSchedule[]> {
    try {
      const query: { patientId: mongoose.Types.ObjectId; active?: boolean } = { patientId };
      if (activeOnly) query.active = true;

      const schedules = await this.medicationScheduleModel.find(query);
      return schedules;
    } catch (error) {
      logger.error(`Failed to get medication schedules: ${error}`);
      throw new AdherenceServiceError(`Failed to get medication schedules: ${error}`);
    }
  }

  // PRIVATE HELPER METHODS

  /**
   * Groups medication events by medication ID
   */
  private groupEventsByMedication(events: MedicationEvent[]): Record<string, MedicationEvent[]> {
    const groups: Record<string, MedicationEvent[]> = {};
    
    for (const event of events) {
      const medId = event.medicationId.toString();
      if (!groups[medId]) {
        groups[medId] = [];
      }
      groups[medId].push(event);
    }
    
    return groups;
  }

  /**
   * Computes adherence metrics for a single medication
   */
  private computeMetricsForMedication(
    patientId: mongoose.Types.ObjectId,
    medicationId: mongoose.Types.ObjectId,
    events: MedicationEvent[],
    timeframe?: { start: Date; end: Date }
  ): AdherenceMetrics {
    // Calculate overall adherence
    const totalEvents = events.length;
    const takenEvents = events.filter(e => e.taken).length;
    const overallAdherence = totalEvents > 0 ? takenEvents / totalEvents : 0;
    
    // Calculate missed and delayed doses
    const missedDoses = events.filter(e => !e.taken && e.skipped).length;
    const delayedDoses = events.filter(e => e.delayed).length;
    
    // Calculate periodic adherence (daily, weekly, monthly)
    const periodicAdherence = this.calculatePeriodicAdherence(events);
    
    // Calculate trends
    const trends = this.calculateAdherenceTrends(events);
    
    return {
      patientId,
      medicationId,
      overallAdherence,
      missedDoses,
      delayedDoses,
      periodicAdherence,
      trends
    };
  }

  /**
   * Calculates periodic adherence rates (daily, weekly, monthly)
   */
  private calculatePeriodicAdherence(events: MedicationEvent[]): AdherenceMetrics['periodicAdherence'] {
    // For simplicity, we'll just do daily adherence here
    // Group events by day
    const eventsByDay: Record<string, MedicationEvent[]> = {};
    
    for (const event of events) {
      const dateStr = event.timestamp.toISOString().split('T')[0];
      if (!eventsByDay[dateStr]) {
        eventsByDay[dateStr] = [];
      }
      eventsByDay[dateStr].push(event);
    }
    
    // Calculate adherence for each day
    const dailyAdherence = Object.entries(eventsByDay).map(([dateStr, dayEvents]) => {
      const takenCount = dayEvents.filter(e => e.taken).length;
      const adherenceRate = takenCount / dayEvents.length;
      
      return {
        date: new Date(dateStr),
        adherenceRate
      };
    });
    
    return {
      period: 'daily',
      data: dailyAdherence
    };
  }

  /**
   * Analyzes trends in medication adherence
   */
  private calculateAdherenceTrends(events: MedicationEvent[]): AdherenceMetrics['trends'] {
    // Simple trend analysis - is adherence improving over time?
    if (events.length < 10) {
      // Not enough data for meaningful trend analysis
      return { improving: false };
    }
    
    // Split events into first half and second half
    const midpoint = Math.floor(events.length / 2);
    const firstHalf = events.slice(0, midpoint);
    const secondHalf = events.slice(midpoint);
    
    // Calculate adherence for each half
    const firstHalfAdherence = firstHalf.filter(e => e.taken).length / firstHalf.length;
    const secondHalfAdherence = secondHalf.filter(e => e.taken).length / secondHalf.length;
    
    // Determine if adherence is improving
    const improving = secondHalfAdherence > firstHalfAdherence;
    
    // Find significant patterns in missed doses
    const missedEvents = events.filter(e => !e.taken && e.skipped);
    const significantMissedPatterns = this.findMissedDosePatterns(missedEvents);
    
    return {
      improving,
      significantMissedPatterns: significantMissedPatterns.length > 0 ? significantMissedPatterns : undefined
    };
  }

  /**
   * Identifies patterns in missed medication doses
   */
  private findMissedDosePatterns(missedEvents: MedicationEvent[]): Array<{ dayOfWeek?: string; timeOfDay?: string; frequency?: number }> {
    if (missedEvents.length < 3) {
      return [];
    }
    
    // Analyze missed doses by day of week
    const missedByDay: Record<string, number> = {};
    const missedByTime: Record<string, number> = {};
    
    for (const event of missedEvents) {
      const dayOfWeek = event.timestamp.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = event.timestamp.getHours();
      let timeOfDay: string;
      
      if (hour < 6) timeOfDay = 'night';
      else if (hour < 12) timeOfDay = 'morning';
      else if (hour < 18) timeOfDay = 'afternoon';
      else timeOfDay = 'evening';
      
      missedByDay[dayOfWeek] = (missedByDay[dayOfWeek] || 0) + 1;
      missedByTime[timeOfDay] = (missedByTime[timeOfDay] || 0) + 1;
    }
    
    // Find significant patterns (more than 30% of missed doses)
    const patterns: Array<{ dayOfWeek?: string; timeOfDay?: string; frequency?: number }> = [];
    const threshold = missedEvents.length * 0.3;
    
    for (const [day, count] of Object.entries(missedByDay)) {
      if (count >= threshold) {
        patterns.push({ dayOfWeek: day, frequency: count });
      }
    }
    
    for (const [time, count] of Object.entries(missedByTime)) {
      if (count >= threshold) {
        patterns.push({ timeOfDay: time, frequency: count });
      }
    }
    
    return patterns;
  }

  /**
   * Checks if alerts should be generated based on adherence patterns
   */
  private async checkForAdherenceAlerts(patientId: mongoose.Types.ObjectId, medicationId: mongoose.Types.ObjectId): Promise<void> {
    try {
      // Get medication details to determine criticality
      const medicationSchedule = await this.medicationScheduleModel.findOne({ 
        patientId, 
        medicationId,
        active: true
      });
      
      if (!medicationSchedule) return;
      
      // Get recent events for this medication
      const recentEvents = await this.medicationEventModel.find({
        patientId,
        medicationId,
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }).sort({ timestamp: -1 });
      
      // Check for consecutive missed doses
      const consecutiveMissed = this.getConsecutiveMissedDoses(recentEvents);
      
      if (consecutiveMissed >= 3) {
        // Create a high severity alert for 3+ consecutive missed doses
        await this.adherenceAlertModel.create({
          patientId,
          medicationId,
          type: 'CRITICAL_MISSED_DOSE',
          message: `Patient has missed ${consecutiveMissed} consecutive doses of ${medicationSchedule.medicationName}`,
          severity: 'HIGH',
          createdAt: new Date(),
          acknowledged: false
        });
      } else if (consecutiveMissed >= 2) {
        // Create a medium severity alert for 2 consecutive missed doses
        await this.adherenceAlertModel.create({
          patientId,
          medicationId,
          type: 'MISSED_DOSE',
          message: `Patient has missed ${consecutiveMissed} consecutive doses of ${medicationSchedule.medicationName}`,
          severity: 'MEDIUM',
          createdAt: new Date(),
          acknowledged: false
        });
      }
      
      // Calculate recent adherence rate
      if (recentEvents.length >= 5) {
        const recentAdherence = recentEvents.filter(e => e.taken).length / recentEvents.length;
        
        if (recentAdherence < 0.7) {
          // Create an alert for poor adherence
          await this.adherenceAlertModel.create({
            patientId,
            medicationId,
            type: 'DECLINING_ADHERENCE',
            message: `Patient's adherence to ${medicationSchedule.medicationName} has fallen below 70%`,
            severity: 'MEDIUM',
            createdAt: new Date(),
            acknowledged: false
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to check for adherence alerts: ${error}`);
      // We don't throw here to prevent affecting the main operation
    }
  }

  /**
   * Calculates consecutive missed doses from recent events
   */
  private getConsecutiveMissedDoses(events: MedicationEvent[]): number {
    let consecutiveMissed = 0;
    
    for (const event of events) {
      if (!event.taken && event.skipped) {
        consecutiveMissed++;
      } else {
        break;  // Break streak if dose was taken
      }
    }
    
    return consecutiveMissed;
  }
}

export default MedicationAdherenceService; 