import { MedicationSafetyMonitor, SafetyIssueType, IssueSeverity, IssueStatus } from '../../../services/MedicationSafetyMonitor';
import { PrescriptionStatus } from '../../../services/ai/PrescriptionSuggestionService';
import { cacheService } from '../../../services/cache';
import mongoose from 'mongoose';

// Initialize medicationSafetyMonitor instance
const medicationSafetyMonitor = MedicationSafetyMonitor.getInstance();

// Mock dependencies
jest.mock('../../../services/cache', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../../repositories/MedicationRepository', () => ({
  medicationRepository: {
    initialize: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('mongoose', () => ({
  Types: {
    ObjectId: jest.fn().mockImplementation(() => ({
      toString: () => 'mocked-id'
    }))
  }
}));

describe('MedicationSafetyMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset internal state
    (medicationSafetyMonitor as any).initialized = false;
    (medicationSafetyMonitor as any).safetyIssues = new Map();
    (medicationSafetyMonitor as any).medicationStats = new Map();
    
    // Mock cache service to return null by default
    (cacheService.get as jest.Mock).mockResolvedValue(null);
  });
  
  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await medicationSafetyMonitor.initialize();
      expect((medicationSafetyMonitor as any).initialized).toBe(true);
    });
    
    it('should load from cache when available', async () => {
      const mockIssues = [
        {
          id: 'issue1',
          patientId: 'patient1',
          medications: ['Aspirin'],
          issueType: SafetyIssueType.ADVERSE_REACTION,
          severity: IssueSeverity.MODERATE,
          description: 'Test issue',
          symptoms: ['nausea'],
          reportDate: new Date(),
          status: IssueStatus.REPORTED
        }
      ];
      
      const mockStats = [
        {
          medicationName: 'Aspirin',
          totalPrescriptions: 100,
          adverseEvents: 5,
          commonSideEffects: [],
          interactionFrequency: [],
          lastUpdated: new Date()
        }
      ];
      
      (cacheService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'safety_issues') return Promise.resolve(mockIssues);
        if (key === 'medication_stats') return Promise.resolve(mockStats);
        return Promise.resolve(null);
      });
      
      await medicationSafetyMonitor.initialize();
      
      expect((medicationSafetyMonitor as any).safetyIssues.size).toBe(1);
      expect((medicationSafetyMonitor as any).medicationStats.size).toBe(1);
    });
  });
  
  describe('Safety Issue Reporting', () => {
    beforeEach(async () => {
      await medicationSafetyMonitor.initialize();
    });
    
    it('should report a new safety issue', async () => {
      const issueInput = {
        patientId: 'patient1',
        medications: ['Lisinopril'],
        issueType: SafetyIssueType.SIDE_EFFECT,
        severity: IssueSeverity.MILD,
        description: 'Patient experienced cough',
        symptoms: ['cough', 'dry throat']
      };
      
      const result = await medicationSafetyMonitor.reportSafetyIssue(issueInput);
      
      expect(result.id).toBeDefined();
      expect(result.patientId).toBe(issueInput.patientId);
      expect(result.status).toBe(IssueStatus.REPORTED);
      
      // Check that the issue was saved
      expect((medicationSafetyMonitor as any).safetyIssues.size).toBe(1);
      expect(cacheService.set).toHaveBeenCalledWith(
        'safety_issues',
        expect.arrayContaining([expect.objectContaining({ patientId: 'patient1' })]),
        expect.any(Number)
      );
    });
    
    it('should update an issue status', async () => {
      // First create an issue
      const issue = await medicationSafetyMonitor.reportSafetyIssue({
        patientId: 'patient1',
        medications: ['Lisinopril'],
        issueType: SafetyIssueType.SIDE_EFFECT,
        severity: IssueSeverity.MILD,
        description: 'Test issue',
        symptoms: ['test']
      });
      
      // Then update its status
      const updatedIssue = await medicationSafetyMonitor.updateIssueStatus(
        issue.id,
        IssueStatus.RESOLVED,
        'Patient recovered'
      );
      
      expect(updatedIssue).not.toBeNull();
      expect(updatedIssue?.status).toBe(IssueStatus.RESOLVED);
      expect(updatedIssue?.resolution).toBe('Patient recovered');
      expect(updatedIssue?.resolvedDate).toBeDefined();
    });
    
    it('should handle updating non-existent issues', async () => {
      const result = await medicationSafetyMonitor.updateIssueStatus(
        'non-existent-id',
        IssueStatus.RESOLVED
      );
      
      expect(result).toBeNull();
    });
  });
  
  describe('Safety Issue Retrieval', () => {
    beforeEach(async () => {
      await medicationSafetyMonitor.initialize();
      
      // Create some test issues
      await medicationSafetyMonitor.reportSafetyIssue({
        patientId: 'patient1',
        medications: ['Lisinopril'],
        issueType: SafetyIssueType.SIDE_EFFECT,
        severity: IssueSeverity.MILD,
        description: 'Issue 1',
        symptoms: ['cough']
      });
      
      await medicationSafetyMonitor.reportSafetyIssue({
        patientId: 'patient1',
        medications: ['Aspirin'],
        issueType: SafetyIssueType.ADVERSE_REACTION,
        severity: IssueSeverity.MODERATE,
        description: 'Issue 2',
        symptoms: ['rash']
      });
      
      await medicationSafetyMonitor.reportSafetyIssue({
        patientId: 'patient2',
        medications: ['Lisinopril'],
        issueType: SafetyIssueType.SIDE_EFFECT,
        severity: IssueSeverity.MILD,
        description: 'Issue 3',
        symptoms: ['dizziness']
      });
    });
    
    it('should retrieve issues for a specific patient', async () => {
      const patientIssues = await medicationSafetyMonitor.getPatientSafetyIssues('patient1');
      
      expect(patientIssues).toHaveLength(2);
      expect(patientIssues.every(issue => issue.patientId === 'patient1')).toBe(true);
    });
    
    it('should retrieve issues for a specific medication', async () => {
      const medicationIssues = await medicationSafetyMonitor.getMedicationSafetyIssues('Lisinopril');
      
      expect(medicationIssues).toHaveLength(2);
      expect(medicationIssues.every(issue => issue.medications.includes('Lisinopril'))).toBe(true);
    });
    
    it('should handle partial medication name matches', async () => {
      const medicationIssues = await medicationSafetyMonitor.getMedicationSafetyIssues('Lisin');
      
      expect(medicationIssues).toHaveLength(2);
    });
  });
  
  describe('Prescription Safety Evaluation', () => {
    beforeEach(async () => {
      await medicationSafetyMonitor.initialize();
      
      // Create a test issue
      await medicationSafetyMonitor.reportSafetyIssue({
        patientId: 'patient1',
        medications: ['Lisinopril'],
        issueType: SafetyIssueType.SIDE_EFFECT,
        severity: IssueSeverity.MODERATE,
        description: 'Previous cough with Lisinopril',
        symptoms: ['cough']
      });
      
      // Create some medication stats
      (medicationSafetyMonitor as any).medicationStats.set('Aspirin', {
        medicationName: 'Aspirin',
        totalPrescriptions: 100,
        adverseEvents: 12, // 12% adverse event rate
        commonSideEffects: [
          { symptom: 'stomach pain', count: 8, percentageOfUsers: 8 },
          { symptom: 'nausea', count: 5, percentageOfUsers: 5 }
        ],
        interactionFrequency: [],
        lastUpdated: new Date()
      });
    });
    
    it('should evaluate prescription safety', async () => {
      const result = await medicationSafetyMonitor.evaluatePrescriptionSafety(
        'prescription1',
        ['Lisinopril', 'Aspirin'],
        'patient1'
      );
      
      expect(result.isSafe).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Previous side_effect'))).toBe(true);
      expect(result.warnings.some(w => w.includes('High adverse event rate'))).toBe(true);
      expect(result.warnings.some(w => w.includes('Common side effects'))).toBe(true);
      expect(result.relatedIssues).toHaveLength(1);
    });
    
    it('should link prescriptions to related issues', async () => {
      await medicationSafetyMonitor.evaluatePrescriptionSafety(
        'prescription1',
        ['Lisinopril'],
        'patient1'
      );
      
      // Get the updated issue
      const patientIssues = await medicationSafetyMonitor.getPatientSafetyIssues('patient1');
      const issue = patientIssues[0];
      
      expect(issue.relatedPrescriptionIds).toBeDefined();
      expect(issue.relatedPrescriptionIds).toContain('prescription1');
    });
  });
  
  describe('Medication Statistics', () => {
    beforeEach(async () => {
      await medicationSafetyMonitor.initialize();
    });
    
    it('should record prescription fulfillment', async () => {
      await medicationSafetyMonitor.recordPrescriptionFulfilled(
        ['Lisinopril', 'Hydrochlorothiazide'],
        'patient1'
      );
      
      const stats = (medicationSafetyMonitor as any).medicationStats;
      expect(stats.size).toBe(2);
      expect(stats.get('Lisinopril').totalPrescriptions).toBe(1);
      expect(stats.get('Hydrochlorothiazide').totalPrescriptions).toBe(1);
    });
    
    it('should increment prescription count for existing medications', async () => {
      // Add initial stats
      (medicationSafetyMonitor as any).medicationStats.set('Lisinopril', {
        medicationName: 'Lisinopril',
        totalPrescriptions: 5,
        adverseEvents: 0,
        commonSideEffects: [],
        interactionFrequency: [],
        lastUpdated: new Date()
      });
      
      await medicationSafetyMonitor.recordPrescriptionFulfilled(
        ['Lisinopril'],
        'patient1'
      );
      
      const stats = (medicationSafetyMonitor as any).medicationStats;
      expect(stats.get('Lisinopril').totalPrescriptions).toBe(6);
    });
    
    it('should retrieve medication statistics', async () => {
      // Add test stats
      (medicationSafetyMonitor as any).medicationStats.set('Lisinopril', {
        medicationName: 'Lisinopril',
        totalPrescriptions: 100,
        adverseEvents: 5,
        commonSideEffects: [],
        interactionFrequency: [],
        lastUpdated: new Date()
      });
      
      const stats = await medicationSafetyMonitor.getMedicationStats('Lisinopril');
      
      expect(stats).not.toBeNull();
      expect(stats?.totalPrescriptions).toBe(100);
      expect(stats?.adverseEvents).toBe(5);
    });
  });
  
  describe('AI Prescription Tracking', () => {
    it('should track prescription suggestions by status', async () => {
      await medicationSafetyMonitor.initialize();
      
      const result = await medicationSafetyMonitor.trackPrescriptionSafety(
        [
          { status: PrescriptionStatus.APPROVED } as any,
          { status: PrescriptionStatus.REQUIRES_REVIEW } as any,
          { status: PrescriptionStatus.APPROVED } as any,
          { status: PrescriptionStatus.REJECTED } as any
        ],
        'patient1',
        'diagnosis1'
      );
      
      expect(result.safeCount).toBe(2);
      expect(result.reviewCount).toBe(1);
      expect(result.rejectedCount).toBe(1);
    });
  });
  
  describe('Safety Reports', () => {
    beforeEach(async () => {
      await medicationSafetyMonitor.initialize();
      
      // Create some test issues with different dates
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      // Issue from last month (outside report period)
      (medicationSafetyMonitor as any).safetyIssues.set('old-issue', {
        id: 'old-issue',
        patientId: 'patient1',
        medications: ['Lisinopril'],
        issueType: SafetyIssueType.SIDE_EFFECT,
        severity: IssueSeverity.MILD,
        description: 'Old issue',
        symptoms: ['cough'],
        reportDate: lastMonth,
        status: IssueStatus.RESOLVED,
        resolvedDate: lastMonth
      });
      
      // Recent issues (within report period)
      (medicationSafetyMonitor as any).safetyIssues.set('recent-issue1', {
        id: 'recent-issue1',
        patientId: 'patient2',
        medications: ['Aspirin'],
        issueType: SafetyIssueType.ADVERSE_REACTION,
        severity: IssueSeverity.MODERATE,
        description: 'Recent issue 1',
        symptoms: ['rash'],
        reportDate: lastWeek,
        status: IssueStatus.RESOLVED,
        resolvedDate: new Date()
      });
      
      (medicationSafetyMonitor as any).safetyIssues.set('recent-issue2', {
        id: 'recent-issue2',
        patientId: 'patient3',
        medications: ['Ibuprofen'],
        issueType: SafetyIssueType.INTERACTION,
        severity: IssueSeverity.SEVERE,
        description: 'Recent issue 2',
        symptoms: ['bleeding'],
        reportDate: new Date(),
        status: IssueStatus.UNDER_INVESTIGATION
      });
      
      (medicationSafetyMonitor as any).safetyIssues.set('recent-issue3', {
        id: 'recent-issue3',
        patientId: 'patient1',
        medications: ['Aspirin', 'Warfarin'],
        issueType: SafetyIssueType.INTERACTION,
        severity: IssueSeverity.SEVERE,
        description: 'Recent issue 3',
        symptoms: ['bleeding'],
        reportDate: new Date(),
        status: IssueStatus.REPORTED
      });
    });
    
    it('should generate safety reports for a time period', async () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const report = await medicationSafetyMonitor.generateSafetyStatistics(
        twoWeeksAgo,
        new Date()
      );
      
      expect(report.totalIssues).toBe(3);
      expect(report.issuesByType[SafetyIssueType.INTERACTION]).toBe(2);
      expect(report.issuesByType[SafetyIssueType.ADVERSE_REACTION]).toBe(1);
      expect(report.issuesBySeverity[IssueSeverity.SEVERE]).toBe(2);
      expect(report.issuesBySeverity[IssueSeverity.MODERATE]).toBe(1);
      expect(report.resolvedIssueRate).toBe(100/3);
      
      // Medication with most issues should be Aspirin (in 2 issues)
      expect(report.medicationsWithMostIssues[0].medication).toBe('Aspirin');
      expect(report.medicationsWithMostIssues[0].count).toBe(2);
    });
  });
}); 