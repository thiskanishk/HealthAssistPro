import { medicationRepository, MedicationRepository } from '../../../repositories/MedicationRepository';
import { cacheService } from '../../../services/cache';

// Mock the cache service
jest.mock('../../../services/cache', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    invalidatePattern: jest.fn(),
  }
}));

// Mock the logger
jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('MedicationRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the repository's internal state
    (medicationRepository as any).initialized = false;
    (medicationRepository as any).medications = new Map();
    (medicationRepository as any).guidelines = new Map();
    (medicationRepository as any).rxNormToMedication = new Map();
  });

  describe('Initialization', () => {
    it('should initialize from cache when available', async () => {
      const mockMedications = [
        {
          id: 'test1',
          name: 'Test Medication',
          genericName: 'test medication',
          brandNames: ['TestBrand'],
          classification: 'Test Class',
          drugClass: ['Test'],
          forms: ['Tablet'],
          strengths: ['10mg'],
          indications: ['Testing'],
          contraindications: [],
          warnings: [],
          sideEffects: [],
          interactions: [],
          dosageGuidelines: [{ route: 'Oral', dosage: '10mg', frequency: 'Once daily', maxDailyDose: '10mg' }],
          references: [],
          updatedAt: new Date(),
        }
      ];
      
      const mockGuidelines = [
        {
          id: 'testG1',
          condition: 'Test Condition',
          icd10Codes: ['T01'],
          firstLineOptions: [{ medications: ['Test Medication'] }],
          secondLineOptions: [],
          specialPopulations: [],
          source: 'Test Source',
          lastUpdated: new Date(),
          evidenceLevel: 'high' as 'high',
        }
      ];
      
      (cacheService.get as jest.Mock).mockImplementation((key) => {
        if (key === 'medications') return Promise.resolve(mockMedications);
        if (key === 'treatment_guidelines') return Promise.resolve(mockGuidelines);
        return Promise.resolve(null);
      });
      
      await medicationRepository.initialize();
      
      expect(cacheService.get).toHaveBeenCalledWith('medications');
      expect(cacheService.get).toHaveBeenCalledWith('treatment_guidelines');
      
      // Verify internal state
      expect((medicationRepository as any).initialized).toBe(true);
      expect((medicationRepository as any).medications.size).toBe(1);
      expect((medicationRepository as any).guidelines.size).toBe(1);
    });
    
    it('should load demo data when cache is not available', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      
      await medicationRepository.initialize();
      
      expect(cacheService.get).toHaveBeenCalledWith('medications');
      expect(cacheService.get).toHaveBeenCalledWith('treatment_guidelines');
      expect(cacheService.set).toHaveBeenCalledTimes(2);
      
      // Verify demo data was loaded
      expect((medicationRepository as any).initialized).toBe(true);
      expect((medicationRepository as any).medications.size).toBeGreaterThan(0);
      expect((medicationRepository as any).guidelines.size).toBeGreaterThan(0);
    });
    
    it('should initialize only once', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      
      await medicationRepository.initialize();
      const initialMedicationsSize = (medicationRepository as any).medications.size;
      
      // This second call should not reload data
      (medicationRepository as any).loadFromDatabase = jest.fn();
      await medicationRepository.initialize();
      
      expect((medicationRepository as any).loadFromDatabase).not.toHaveBeenCalled();
      expect((medicationRepository as any).medications.size).toBe(initialMedicationsSize);
    });
  });
  
  describe('Medication Retrieval', () => {
    beforeEach(async () => {
      // Ensure the repository is initialized with demo data
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      await medicationRepository.initialize();
    });
    
    it('should retrieve medication by exact name', async () => {
      const med = await medicationRepository.getMedicationByName('Lisinopril');
      expect(med).not.toBeNull();
      expect(med?.name).toBe('Lisinopril');
    });
    
    it('should retrieve medication by case-insensitive name', async () => {
      const med = await medicationRepository.getMedicationByName('lisinopril');
      expect(med).not.toBeNull();
      expect(med?.name).toBe('Lisinopril');
    });
    
    it('should retrieve medication by brand name', async () => {
      const med = await medicationRepository.getMedicationByName('Advil');
      expect(med).not.toBeNull();
      expect(med?.name).toBe('Ibuprofen');
    });
    
    it('should retrieve medication by partial name match', async () => {
      const med = await medicationRepository.getMedicationByName('Ibupro');
      expect(med).not.toBeNull();
      expect(med?.name).toBe('Ibuprofen');
    });
    
    it('should return null for non-existent medication', async () => {
      const med = await medicationRepository.getMedicationByName('NonExistentMed');
      expect(med).toBeNull();
    });
    
    it('should retrieve medication by RxNorm code', async () => {
      const med = await medicationRepository.getMedicationByRxNorm('5640');
      expect(med).not.toBeNull();
      expect(med?.name).toBe('Ibuprofen');
    });
  });
  
  describe('Treatment Guidelines', () => {
    beforeEach(async () => {
      // Ensure the repository is initialized with demo data
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      await medicationRepository.initialize();
    });
    
    it('should retrieve guidelines by exact condition name', async () => {
      const guideline = await medicationRepository.getGuidelinesForCondition('Hypertension');
      expect(guideline).not.toBeNull();
      expect(guideline?.condition).toBe('Hypertension');
    });
    
    it('should retrieve guidelines by case-insensitive condition name', async () => {
      const guideline = await medicationRepository.getGuidelinesForCondition('hypertension');
      expect(guideline).not.toBeNull();
      expect(guideline?.condition).toBe('Hypertension');
    });
    
    it('should retrieve guidelines by partial condition match', async () => {
      const guideline = await medicationRepository.getGuidelinesForCondition('Type 2');
      expect(guideline).not.toBeNull();
      expect(guideline?.condition).toBe('Type 2 Diabetes Mellitus');
    });
    
    it('should retrieve guidelines by ICD-10 code', async () => {
      const guideline = await medicationRepository.getGuidelinesByICD10('I10');
      expect(guideline).not.toBeNull();
      expect(guideline?.condition).toBe('Hypertension');
    });
    
    it('should return null for non-existent condition', async () => {
      const guideline = await medicationRepository.getGuidelinesForCondition('NonExistentCondition');
      expect(guideline).toBeNull();
    });
  });
  
  describe('Medical Safety Checks', () => {
    beforeEach(async () => {
      // Ensure the repository is initialized with demo data
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      await medicationRepository.initialize();
    });
    
    it('should check Beers Criteria for inappropriate medications', async () => {
      const result = await medicationRepository.checkBeersCriteria('Diphenhydramine');
      expect(result).not.toBeNull();
      expect(result?.isInappropriate).toBe(true);
    });
    
    it('should check Beers Criteria for appropriate medications', async () => {
      const result = await medicationRepository.checkBeersCriteria('Lisinopril');
      expect(result).not.toBeNull();
      expect(result?.isInappropriate).toBe(false);
    });
    
    it('should check pregnancy category', async () => {
      const category = await medicationRepository.checkPregnancyCategory('Lisinopril');
      expect(category).toBe('D');
    });
    
    it('should find interactions between medications', async () => {
      const interactions = await medicationRepository.checkInteractions('Lisinopril', ['NSAIDs']);
      expect(interactions.length).toBeGreaterThan(0);
      expect(interactions[0].severity).toBe('moderate');
    });
    
    it('should find interactions with case-insensitive and partial matches', async () => {
      const interactions = await medicationRepository.checkInteractions('Ibuprofen', ['Warfarin']);
      expect(interactions.length).toBeGreaterThan(0);
      expect(interactions[0].severity).toBe('high');
    });
  });
  
  describe('Dosage Guidelines', () => {
    beforeEach(async () => {
      // Ensure the repository is initialized with demo data
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      await medicationRepository.initialize();
    });
    
    it('should retrieve all dosage guidelines for a medication', async () => {
      const guidelines = await medicationRepository.getDosageGuidelines('Ibuprofen');
      expect(guidelines).not.toBeNull();
      expect(guidelines?.length).toBeGreaterThan(0);
    });
    
    it('should filter dosage guidelines by age group', async () => {
      const guidelines = await medicationRepository.getDosageGuidelines('Ibuprofen', 8);
      expect(guidelines).not.toBeNull();
      expect(guidelines?.some(g => g.ageGroup === 'pediatric')).toBe(true);
    });
    
    it('should filter dosage guidelines by condition', async () => {
      const guidelines = await medicationRepository.getDosageGuidelines('Ibuprofen', undefined, undefined, 'Arthritis');
      expect(guidelines).not.toBeNull();
      expect(guidelines?.some(g => g.condition === 'Arthritis')).toBe(true);
    });
    
    it('should handle non-existent medications', async () => {
      const guidelines = await medicationRepository.getDosageGuidelines('NonExistentMed');
      expect(guidelines).toBeNull();
    });
  });
}); 