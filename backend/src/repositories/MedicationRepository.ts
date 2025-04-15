import mongoose from 'mongoose';
import { cacheService } from '../services/cache';
import logger from '../utils/logger';
import Medication, { IMedication } from '../models/Medication';

/**
 * Medication information including dosage and administration details
 */
export interface Medication {
  id: string;
  name: string;
  genericName: string;
  brandNames: string[];
  classification: string;
  drugClass: string[];
  rxNormCode?: string;
  atcCode?: string;
  forms: string[];
  strengths: string[];
  indications: string[];
  contraindications: string[];
  warnings: string[];
  sideEffects: string[];
  interactions: {
    medication: string;
    severity: 'high' | 'moderate' | 'low';
    description: string;
    evidenceLevel: 'strong' | 'moderate' | 'limited';
  }[];
  dosageGuidelines: {
    ageGroup?: string;
    weightRange?: {
      min?: number;
      max?: number;
    };
    condition?: string;
    route: string;
    dosage: string;
    frequency: string;
    maxDailyDose: string;
    duration?: string;
    notes?: string;
  }[];
  pediatricUse?: {
    isSafe: boolean;
    minimumAge?: number;
    dosageAdjustment?: string;
    warnings?: string[];
  };
  pregnancyCategory?: 'A' | 'B' | 'C' | 'D' | 'X';
  beersCriteria?: {
    isInappropriate: boolean;
    reason?: string;
    recommendation?: string;
  };
  renalDosing?: {
    requiresAdjustment: boolean;
    guidelines?: string;
  };
  hepaticDosing?: {
    requiresAdjustment: boolean;
    guidelines?: string;
  };
  references: string[];
  updatedAt: Date;
}

/**
 * Guidelines for medication usage by condition
 */
export interface TreatmentGuideline {
  id: string;
  condition: string;
  icd10Codes: string[];
  firstLineOptions: {
    medications: string[];
    notes?: string;
  }[];
  secondLineOptions: {
    medications: string[];
    notes?: string;
  }[];
  specialPopulations: {
    population: 'pediatric' | 'geriatric' | 'pregnant' | 'renalImpairment' | 'hepaticImpairment';
    recommendations: string[];
    medications: string[];
  }[];
  source: string;
  lastUpdated: Date;
  evidenceLevel: 'high' | 'moderate' | 'low';
}

export interface MedicationFilter {
  name?: string;
  genericName?: string;
  drugClass?: string[];
  controlledSubstance?: boolean;
  pregnancyCategory?: string;
  searchText?: string;
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Repository for managing medication data and guidelines
 */
export class MedicationRepository {
  private static instance: MedicationRepository;
  private medications: Map<string, Medication> = new Map();
  private guidelines: Map<string, TreatmentGuideline> = new Map();
  private rxNormToMedication: Map<string, string> = new Map();
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get singleton instance of MedicationRepository
   */
  public static getInstance(): MedicationRepository {
    if (!MedicationRepository.instance) {
      MedicationRepository.instance = new MedicationRepository();
    }
    return MedicationRepository.instance;
  }

  /**
   * Initialize the repository with data
   * Loads from database and caches results
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Try to load from cache first
      const cachedMedications = await cacheService.get<Medication[]>('medications');
      const cachedGuidelines = await cacheService.get<TreatmentGuideline[]>('treatment_guidelines');

      if (cachedMedications && cachedGuidelines) {
        this.loadFromCache(cachedMedications, cachedGuidelines);
        this.initialized = true;
        logger.info('Medication repository initialized from cache');
        return;
      }

      // Load from database if not in cache
      await this.loadFromDatabase();
      this.initialized = true;
      logger.info('Medication repository initialized from database');
    } catch (error) {
      logger.error('Failed to initialize medication repository', error);
      // Load demo data for testing if database fails
      await this.loadDemoData();
      this.initialized = true;
    }
  }

  /**
   * Get medication by name (case insensitive, partial match)
   */
  public async getMedicationByName(name: string): Promise<Medication | null> {
    await this.ensureInitialized();
    
    // First try exact match
    for (const medication of this.medications.values()) {
      if (medication.name.toLowerCase() === name.toLowerCase()) {
        return medication;
      }
    }
    
    // Then try brand names
    for (const medication of this.medications.values()) {
      if (medication.brandNames.some(brand => brand.toLowerCase() === name.toLowerCase())) {
        return medication;
      }
    }
    
    // Then try partial matches
    for (const medication of this.medications.values()) {
      if (medication.name.toLowerCase().includes(name.toLowerCase())) {
        return medication;
      }
      
      if (medication.genericName.toLowerCase().includes(name.toLowerCase())) {
        return medication;
      }
      
      if (medication.brandNames.some(brand => brand.toLowerCase().includes(name.toLowerCase()))) {
        return medication;
      }
    }
    
    return null;
  }

  /**
   * Get medication by RxNorm code
   */
  public async getMedicationByRxNorm(rxNormCode: string): Promise<Medication | null> {
    await this.ensureInitialized();
    const medicationId = this.rxNormToMedication.get(rxNormCode);
    if (!medicationId) return null;
    return this.medications.get(medicationId) || null;
  }

  /**
   * Get treatment guidelines for a condition
   */
  public async getGuidelinesForCondition(condition: string): Promise<TreatmentGuideline | null> {
    await this.ensureInitialized();
    
    // Try exact match
    for (const guideline of this.guidelines.values()) {
      if (guideline.condition.toLowerCase() === condition.toLowerCase()) {
        return guideline;
      }
    }
    
    // Try partial match
    for (const guideline of this.guidelines.values()) {
      if (guideline.condition.toLowerCase().includes(condition.toLowerCase())) {
        return guideline;
      }
    }
    
    return null;
  }

  /**
   * Get guidelines by ICD-10 code
   */
  public async getGuidelinesByICD10(icd10Code: string): Promise<TreatmentGuideline | null> {
    await this.ensureInitialized();
    
    for (const guideline of this.guidelines.values()) {
      if (guideline.icd10Codes.includes(icd10Code)) {
        return guideline;
      }
    }
    
    return null;
  }

  /**
   * Check if a medication is in the Beers Criteria (potentially inappropriate for elderly)
   */
  public async checkBeersCriteria(medicationName: string): Promise<{isInappropriate: boolean, reason?: string, recommendation?: string} | null> {
    await this.ensureInitialized();
    
    const medication = await this.getMedicationByName(medicationName);
    if (!medication || !medication.beersCriteria) {
      return null;
    }
    
    return medication.beersCriteria;
  }

  /**
   * Check for known interactions between medications
   */
  public async checkInteractions(
    medicationName: string, 
    otherMedications: string[]
  ): Promise<Array<{
    medication: string;
    severity: 'high' | 'moderate' | 'low';
    description: string;
    evidenceLevel: 'strong' | 'moderate' | 'limited';
  }>> {
    await this.ensureInitialized();
    
    const medication = await this.getMedicationByName(medicationName);
    if (!medication) {
      return [];
    }
    
    const interactions = [];
    
    for (const otherMed of otherMedications) {
      const normalizedOtherMed = otherMed.toLowerCase();
      
      for (const interaction of medication.interactions) {
        if (interaction.medication.toLowerCase() === normalizedOtherMed || 
            normalizedOtherMed.includes(interaction.medication.toLowerCase()) ||
            interaction.medication.toLowerCase().includes(normalizedOtherMed)) {
          interactions.push(interaction);
          break;
        }
      }
    }
    
    return interactions;
  }

  /**
   * Get dosage guidelines for a medication based on patient factors
   */
  public async getDosageGuidelines(
    medicationName: string,
    age?: number,
    weight?: number,
    condition?: string
  ): Promise<Medication['dosageGuidelines'] | null> {
    await this.ensureInitialized();
    
    const medication = await this.getMedicationByName(medicationName);
    if (!medication) {
      return null;
    }
    
    // Filter guidelines based on provided factors
    const matchingGuidelines = medication.dosageGuidelines.filter(guideline => {
      let matches = true;
      
      if (age && guideline.ageGroup) {
        if (guideline.ageGroup === 'pediatric' && age >= 18) matches = false;
        if (guideline.ageGroup === 'adult' && age < 18) matches = false;
        if (guideline.ageGroup === 'geriatric' && age < 65) matches = false;
      }
      
      if (weight && guideline.weightRange) {
        if (guideline.weightRange.min && weight < guideline.weightRange.min) matches = false;
        if (guideline.weightRange.max && weight > guideline.weightRange.max) matches = false;
      }
      
      if (condition && guideline.condition && 
          !guideline.condition.toLowerCase().includes(condition.toLowerCase()) &&
          !condition.toLowerCase().includes(guideline.condition.toLowerCase())) {
        matches = false;
      }
      
      return matches;
    });
    
    return matchingGuidelines.length > 0 ? matchingGuidelines : medication.dosageGuidelines;
  }

  /**
   * Check if a medication is appropriate for a pregnant patient
   */
  public async checkPregnancyCategory(medicationName: string): Promise<string | null> {
    await this.ensureInitialized();
    
    const medication = await this.getMedicationByName(medicationName);
    if (!medication || !medication.pregnancyCategory) {
      return null;
    }
    
    return medication.pregnancyCategory;
  }

  /**
   * Ensure the repository is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Load data from MongoDB or other database
   */
  private async loadFromDatabase(): Promise<void> {
    // Implement database loading logic when database schema is available
    // For now, load demo data
    await this.loadDemoData();
    
    // Cache the loaded data
    const medicationsArray = Array.from(this.medications.values());
    const guidelinesArray = Array.from(this.guidelines.values());
    
    await cacheService.set('medications', medicationsArray, 86400); // Cache for 24 hours
    await cacheService.set('treatment_guidelines', guidelinesArray, 86400);
  }

  /**
   * Load data from cache
   */
  private loadFromCache(medications: Medication[], guidelines: TreatmentGuideline[]): void {
    this.medications.clear();
    this.guidelines.clear();
    this.rxNormToMedication.clear();
    
    for (const med of medications) {
      this.medications.set(med.id, med);
      if (med.rxNormCode) {
        this.rxNormToMedication.set(med.rxNormCode, med.id);
      }
    }
    
    for (const guideline of guidelines) {
      this.guidelines.set(guideline.id, guideline);
    }
  }

  /**
   * Load demo data for testing
   */
  private async loadDemoData(): Promise<void> {
    // Add some common medications for testing
    const medications: Medication[] = [
      {
        id: '1',
        name: 'Lisinopril',
        genericName: 'lisinopril',
        brandNames: ['Prinivil', 'Zestril'],
        classification: 'ACE Inhibitor',
        drugClass: ['Antihypertensive', 'ACE Inhibitor'],
        rxNormCode: '29046',
        atcCode: 'C09AA03',
        forms: ['Tablet', 'Solution'],
        strengths: ['5 mg', '10 mg', '20 mg', '40 mg'],
        indications: ['Hypertension', 'Heart Failure', 'Post-Myocardial Infarction'],
        contraindications: ['Pregnancy', 'History of angioedema', 'Bilateral renal artery stenosis'],
        warnings: ['May cause cough', 'May increase potassium levels', 'Risk of hypotension'],
        sideEffects: ['Cough', 'Dizziness', 'Headache', 'Fatigue', 'Hyperkalemia'],
        interactions: [
          {
            medication: 'Spironolactone',
            severity: 'moderate',
            description: 'May increase risk of hyperkalemia',
            evidenceLevel: 'strong'
          },
          {
            medication: 'NSAIDs',
            severity: 'moderate',
            description: 'May reduce antihypertensive effect',
            evidenceLevel: 'strong'
          },
          {
            medication: 'Lithium',
            severity: 'moderate',
            description: 'May increase lithium levels',
            evidenceLevel: 'moderate'
          }
        ],
        dosageGuidelines: [
          {
            condition: 'Hypertension',
            route: 'Oral',
            dosage: '10 mg',
            frequency: 'Once daily',
            maxDailyDose: '40 mg',
            notes: 'Start with 5 mg in patients on diuretics'
          },
          {
            condition: 'Heart Failure',
            route: 'Oral',
            dosage: '5 mg',
            frequency: 'Once daily',
            maxDailyDose: '40 mg',
            notes: 'Titrate up to target dose as tolerated'
          }
        ],
        pregnancyCategory: 'D',
        beersCriteria: {
          isInappropriate: false,
          reason: '',
          recommendation: ''
        },
        renalDosing: {
          requiresAdjustment: true,
          guidelines: 'For CrCl < 30 mL/min, start with 5 mg daily'
        },
        hepaticDosing: {
          requiresAdjustment: false,
          guidelines: ''
        },
        references: [
          'American Heart Association Guidelines',
          'JNC 8 Guidelines for Hypertension'
        ],
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Metformin',
        genericName: 'metformin',
        brandNames: ['Glucophage', 'Fortamet', 'Glumetza', 'Riomet'],
        classification: 'Biguanide',
        drugClass: ['Antidiabetic', 'Biguanide'],
        rxNormCode: '6809',
        atcCode: 'A10BA02',
        forms: ['Tablet', 'Extended-release tablet', 'Solution'],
        strengths: ['500 mg', '850 mg', '1000 mg'],
        indications: ['Type 2 Diabetes Mellitus', 'Insulin Resistance', 'PCOS'],
        contraindications: [
          'Renal impairment (eGFR < 30 mL/min)',
          'Metabolic acidosis',
          'Severe heart failure'
        ],
        warnings: [
          'Risk of lactic acidosis',
          'Temporarily discontinue in patients undergoing radiologic studies with iodinated contrast',
          'May impair vitamin B12 absorption'
        ],
        sideEffects: [
          'Diarrhea',
          'Nausea',
          'Abdominal pain',
          'Metallic taste',
          'Vitamin B12 deficiency'
        ],
        interactions: [
          {
            medication: 'Cimetidine',
            severity: 'moderate',
            description: 'May increase metformin levels',
            evidenceLevel: 'moderate'
          },
          {
            medication: 'Furosemide',
            severity: 'low',
            description: 'May reduce metformin clearance',
            evidenceLevel: 'moderate'
          },
          {
            medication: 'Contrast media',
            severity: 'high',
            description: 'Increases risk of lactic acidosis',
            evidenceLevel: 'strong'
          }
        ],
        dosageGuidelines: [
          {
            condition: 'Type 2 Diabetes',
            route: 'Oral',
            dosage: '500 mg',
            frequency: 'Twice daily',
            maxDailyDose: '2550 mg',
            notes: 'Take with meals to reduce GI side effects'
          },
          {
            condition: 'Type 2 Diabetes - Extended Release',
            route: 'Oral',
            dosage: '500-1000 mg',
            frequency: 'Once daily',
            maxDailyDose: '2000 mg',
            notes: 'Take with evening meal'
          }
        ],
        pregnancyCategory: 'B',
        beersCriteria: {
          isInappropriate: false,
          reason: '',
          recommendation: ''
        },
        renalDosing: {
          requiresAdjustment: true,
          guidelines: 'Contraindicated if eGFR < 30 mL/min. For eGFR 30-45 mL/min, maximum 1000 mg/day.'
        },
        hepaticDosing: {
          requiresAdjustment: true,
          guidelines: 'Avoid in severe hepatic impairment due to increased risk of lactic acidosis'
        },
        references: [
          'American Diabetes Association Standards of Care',
          'NICE Guidelines for Type 2 Diabetes'
        ],
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Ibuprofen',
        genericName: 'ibuprofen',
        brandNames: ['Advil', 'Motrin', 'Nurofen'],
        classification: 'NSAID',
        drugClass: ['Anti-inflammatory', 'Analgesic', 'Antipyretic'],
        rxNormCode: '5640',
        atcCode: 'M01AE01',
        forms: ['Tablet', 'Capsule', 'Suspension', 'Gel'],
        strengths: ['200 mg', '400 mg', '600 mg', '800 mg'],
        indications: ['Pain', 'Inflammation', 'Fever', 'Arthritis'],
        contraindications: [
          'Active peptic ulcer disease',
          'Severe heart failure',
          'Third trimester of pregnancy',
          'History of NSAID-induced asthma'
        ],
        warnings: [
          'Increased risk of cardiovascular events',
          'Increased risk of GI bleeding',
          'May cause renal impairment',
          'May worsen hypertension'
        ],
        sideEffects: [
          'Nausea',
          'Dyspepsia',
          'GI bleeding',
          'Dizziness',
          'Edema',
          'Hypertension'
        ],
        interactions: [
          {
            medication: 'Aspirin',
            severity: 'moderate',
            description: 'Increased risk of GI bleeding',
            evidenceLevel: 'strong'
          },
          {
            medication: 'Warfarin',
            severity: 'high',
            description: 'Increased risk of bleeding',
            evidenceLevel: 'strong'
          },
          {
            medication: 'ACE inhibitors',
            severity: 'moderate',
            description: 'May reduce antihypertensive effect',
            evidenceLevel: 'strong'
          },
          {
            medication: 'Lithium',
            severity: 'moderate',
            description: 'May increase lithium levels',
            evidenceLevel: 'moderate'
          }
        ],
        dosageGuidelines: [
          {
            condition: 'Pain/Fever',
            route: 'Oral',
            dosage: '200-400 mg',
            frequency: 'Every 4-6 hours',
            maxDailyDose: '1200 mg',
            notes: 'Take with food to reduce GI side effects'
          },
          {
            condition: 'Arthritis',
            route: 'Oral',
            dosage: '400-800 mg',
            frequency: 'Three times daily',
            maxDailyDose: '3200 mg'
          },
          {
            ageGroup: 'pediatric',
            condition: 'Pain/Fever',
            route: 'Oral',
            dosage: '5-10 mg/kg',
            frequency: 'Every 6-8 hours',
            maxDailyDose: '40 mg/kg/day',
            notes: 'Not for children under 6 months'
          }
        ],
        pediatricUse: {
          isSafe: true,
          minimumAge: 6,
          dosageAdjustment: 'Weight-based dosing required',
          warnings: ['Risk of Reye syndrome if given during viral infections']
        },
        pregnancyCategory: 'C',
        beersCriteria: {
          isInappropriate: true,
          reason: 'Increased risk of GI bleeding and peptic ulcer disease in older adults',
          recommendation: 'Avoid chronic use unless other alternatives are not effective'
        },
        renalDosing: {
          requiresAdjustment: true,
          guidelines: 'Avoid in severe renal impairment (CrCl < 30 mL/min)'
        },
        hepaticDosing: {
          requiresAdjustment: true,
          guidelines: 'Use with caution in hepatic impairment; reduce dosage'
        },
        references: [
          'FDA prescribing information',
          'American College of Rheumatology Guidelines'
        ],
        updatedAt: new Date()
      },
      {
        id: '4',
        name: 'Diphenhydramine',
        genericName: 'diphenhydramine',
        brandNames: ['Benadryl', 'Nytol', 'Sominex'],
        classification: 'Antihistamine',
        drugClass: ['Antihistamine', 'Anticholinergic', 'Sedative'],
        rxNormCode: '3627',
        atcCode: 'R06AA02',
        forms: ['Tablet', 'Capsule', 'Liquid', 'Injection'],
        strengths: ['25 mg', '50 mg'],
        indications: ['Allergic reactions', 'Insomnia', 'Motion sickness', 'Cough suppression'],
        contraindications: [
          'Narrow-angle glaucoma',
          'Prostatic hyperplasia',
          'Bladder neck obstruction',
          'Asthma'
        ],
        warnings: [
          'May cause sedation',
          'Anticholinergic effects',
          'May worsen urinary retention',
          'May worsen glaucoma'
        ],
        sideEffects: [
          'Drowsiness',
          'Dry mouth',
          'Blurred vision',
          'Constipation',
          'Urinary retention',
          'Confusion (especially in elderly)'
        ],
        interactions: [
          {
            medication: 'Alcohol',
            severity: 'high',
            description: 'Enhanced CNS depression',
            evidenceLevel: 'strong'
          },
          {
            medication: 'MAO inhibitors',
            severity: 'moderate',
            description: 'May prolong and intensify anticholinergic effects',
            evidenceLevel: 'moderate'
          },
          {
            medication: 'Other anticholinergics',
            severity: 'moderate',
            description: 'Additive anticholinergic effects',
            evidenceLevel: 'strong'
          }
        ],
        dosageGuidelines: [
          {
            condition: 'Allergic reactions',
            route: 'Oral',
            dosage: '25-50 mg',
            frequency: 'Every 4-6 hours',
            maxDailyDose: '300 mg'
          },
          {
            condition: 'Insomnia',
            route: 'Oral',
            dosage: '50 mg',
            frequency: 'At bedtime',
            maxDailyDose: '50 mg'
          },
          {
            ageGroup: 'pediatric',
            condition: 'Allergic reactions',
            weightRange: {
              min: 10,
              max: 20
            },
            route: 'Oral',
            dosage: '12.5-25 mg',
            frequency: 'Every 4-6 hours',
            maxDailyDose: '150 mg',
            notes: 'Not for children under 2 years'
          }
        ],
        pediatricUse: {
          isSafe: true,
          minimumAge: 2,
          dosageAdjustment: 'Weight-based dosing required',
          warnings: ['May cause paradoxical excitation in young children']
        },
        pregnancyCategory: 'B',
        beersCriteria: {
          isInappropriate: true,
          reason: 'Highly anticholinergic; increased risk of confusion, dry mouth, constipation, and other anticholinergic effects',
          recommendation: 'Avoid use in older adults'
        },
        renalDosing: {
          requiresAdjustment: true,
          guidelines: 'Consider reduced dosage in renal impairment'
        },
        hepaticDosing: {
          requiresAdjustment: true,
          guidelines: 'Consider reduced dosage in hepatic impairment'
        },
        references: [
          'FDA prescribing information',
          'American Geriatrics Society Beers Criteria'
        ],
        updatedAt: new Date()
      }
    ];

    // Add some treatment guidelines
    const guidelines: TreatmentGuideline[] = [
      {
        id: '1',
        condition: 'Hypertension',
        icd10Codes: ['I10', 'I11', 'I12', 'I13'],
        firstLineOptions: [
          {
            medications: ['Lisinopril', 'Hydrochlorothiazide', 'Amlodipine', 'Losartan'],
            notes: 'Choice depends on comorbidities and patient characteristics'
          }
        ],
        secondLineOptions: [
          {
            medications: ['Metoprolol', 'Chlorthalidone', 'Valsartan', 'Diltiazem'],
            notes: 'Consider if inadequate response to first-line options'
          }
        ],
        specialPopulations: [
          {
            population: 'pregnant',
            recommendations: ['Avoid ACE inhibitors and ARBs'],
            medications: ['Methyldopa', 'Labetalol', 'Nifedipine']
          },
          {
            population: 'renalImpairment',
            recommendations: ['Avoid thiazide diuretics if eGFR < 30 mL/min'],
            medications: ['Amlodipine', 'Hydralazine']
          }
        ],
        source: 'JNC 8 Guidelines',
        lastUpdated: new Date('2021-01-15'),
        evidenceLevel: 'high'
      },
      {
        id: '2',
        condition: 'Type 2 Diabetes Mellitus',
        icd10Codes: ['E11'],
        firstLineOptions: [
          {
            medications: ['Metformin'],
            notes: 'Start with low dose and titrate up to reduce GI side effects'
          }
        ],
        secondLineOptions: [
          {
            medications: ['Sulfonylureas', 'DPP-4 inhibitors', 'SGLT2 inhibitors', 'GLP-1 receptor agonists'],
            notes: 'Add second agent if HbA1c target not achieved after 3 months of metformin'
          }
        ],
        specialPopulations: [
          {
            population: 'renalImpairment',
            recommendations: ['Avoid metformin if eGFR < 30 mL/min'],
            medications: ['DPP-4 inhibitors', 'Insulin']
          },
          {
            population: 'geriatric',
            recommendations: ['Avoid sulfonylureas due to hypoglycemia risk'],
            medications: ['DPP-4 inhibitors', 'Metformin']
          }
        ],
        source: 'American Diabetes Association Standards of Care',
        lastUpdated: new Date('2022-01-20'),
        evidenceLevel: 'high'
      },
      {
        id: '3',
        condition: 'Acute Pain',
        icd10Codes: ['R52', 'G89.0', 'G89.1'],
        firstLineOptions: [
          {
            medications: ['Acetaminophen', 'Ibuprofen', 'Naproxen'],
            notes: 'Start with non-opioid analgesics'
          }
        ],
        secondLineOptions: [
          {
            medications: ['Tramadol', 'Codeine', 'Hydrocodone', 'Oxycodone'],
            notes: 'Consider weak opioids if inadequate pain relief with non-opioids'
          }
        ],
        specialPopulations: [
          {
            population: 'geriatric',
            recommendations: ['Start with lower doses', 'Avoid NSAIDs if possible'],
            medications: ['Acetaminophen', 'Tramadol (reduced dose)']
          },
          {
            population: 'hepaticImpairment',
            recommendations: ['Avoid acetaminophen or reduce dosage'],
            medications: ['Tramadol (reduced dose)', 'Hydromorphone (reduced dose)']
          }
        ],
        source: 'WHO Pain Ladder Guidelines',
        lastUpdated: new Date('2021-06-10'),
        evidenceLevel: 'high'
      }
    ];

    // Store the demo data
    for (const med of medications) {
      this.medications.set(med.id, med);
      if (med.rxNormCode) {
        this.rxNormToMedication.set(med.rxNormCode, med.id);
      }
    }
    
    for (const guideline of guidelines) {
      this.guidelines.set(guideline.id, guideline);
    }
  }

  /**
   * Get a medication by its ID
   */
  async getMedicationById(id: string): Promise<IMedication | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }
      return await Medication.findById(id);
    } catch (error) {
      logger.error(`Error fetching medication with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get medications by name or generic name (case-insensitive)
   */
  async getMedicationsByName(name: string): Promise<IMedication[]> {
    try {
      const nameRegex = new RegExp(name, 'i');
      return await Medication.find({
        $or: [
          { name: nameRegex },
          { genericName: nameRegex }
        ],
        isActive: true
      });
    } catch (error) {
      logger.error(`Error fetching medications with name ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get medications by drug class
   */
  async getMedicationsByClass(drugClass: string): Promise<IMedication[]> {
    try {
      return await Medication.findByClass(drugClass).exec();
    } catch (error) {
      logger.error(`Error fetching medications with class ${drugClass}:`, error);
      throw error;
    }
  }

  /**
   * Search medications with text search
   */
  async searchMedications(searchText: string): Promise<IMedication[]> {
    try {
      return await Medication.searchByText(searchText).exec();
    } catch (error) {
      logger.error(`Error searching medications with text ${searchText}:`, error);
      throw error;
    }
  }

  /**
   * Find medication alternatives (same drug class)
   */
  async findAlternatives(medicationId: string): Promise<IMedication[]> {
    try {
      // Using the aggregate method requires us to handle the result differently
      const alternatives = await Medication.findAlternatives(medicationId).exec();
      return alternatives || [];
    } catch (error) {
      logger.error(`Error finding alternatives for medication ${medicationId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new medication
   */
  async createMedication(medicationData: Partial<IMedication>): Promise<IMedication> {
    try {
      const medication = new Medication(medicationData);
      return await medication.save();
    } catch (error) {
      logger.error('Error creating medication:', error);
      throw error;
    }
  }

  /**
   * Update an existing medication
   */
  async updateMedication(id: string, medicationData: Partial<IMedication>): Promise<IMedication | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }
      return await Medication.findByIdAndUpdate(
        id, 
        medicationData, 
        { new: true, runValidators: true }
      );
    } catch (error) {
      logger.error(`Error updating medication ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a medication (set isActive to false)
   */
  async deactivateMedication(id: string): Promise<IMedication | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }
      return await Medication.findByIdAndUpdate(
        id, 
        { isActive: false }, 
        { new: true }
      );
    } catch (error) {
      logger.error(`Error deactivating medication ${id}:`, error);
      throw error;
    }
  }

  /**
   * Check if medications have interactions with each other
   */
  async checkMedicationInteractions(medicationIds: string[]): Promise<{
    hasPotentialInteractions: boolean,
    medications: {id: string, name: string}[]
  }> {
    try {
      // Get all medications
      const medications = await Medication.find({
        _id: { $in: medicationIds.filter(id => mongoose.Types.ObjectId.isValid(id)) }
      });

      // Create a map of medication IDs to their interactsWith arrays
      const interactionMap = new Map<string, string[]>();
      medications.forEach(med => {
        if (med.interactsWith && med.interactsWith.length > 0) {
          interactionMap.set(med._id.toString(), med.interactsWith);
        }
      });

      // Check for interactions between the medications
      let hasPotentialInteractions = false;
      for (let i = 0; i < medications.length; i++) {
        const med1 = medications[i];
        const med1Id = med1._id.toString();
        const med1Interactions = interactionMap.get(med1Id) || [];
        
        for (let j = i + 1; j < medications.length; j++) {
          const med2 = medications[j];
          const med2Id = med2._id.toString();
          
          // Check if med1 interacts with med2 or vice versa
          if (
            med1Interactions.includes(med2.genericName) || 
            med1Interactions.includes(med2.name) ||
            (interactionMap.get(med2Id) || []).includes(med1.genericName) ||
            (interactionMap.get(med2Id) || []).includes(med1.name)
          ) {
            hasPotentialInteractions = true;
            break;
          }
        }
        
        if (hasPotentialInteractions) break;
      }

      return {
        hasPotentialInteractions,
        medications: medications.map(med => ({ 
          id: med._id.toString(), 
          name: `${med.name} ${med.strength} ${med.dosageForm}`
        }))
      };
    } catch (error) {
      logger.error(`Error checking medication interactions:`, error);
      throw error;
    }
  }
  
  /**
   * Get total count of medications
   */
  async getTotalMedicationCount(): Promise<number> {
    try {
      return await Medication.countDocuments({ isActive: true });
    } catch (error) {
      logger.error('Error getting total medication count:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const medicationRepository = MedicationRepository.getInstance(); 