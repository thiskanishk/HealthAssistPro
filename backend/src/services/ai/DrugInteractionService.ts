import { aiService } from './AIServiceManager';
import logger from '../../utils/logger';
import { InteractionSeverity, DrugInteractionRisk } from './PrescriptionSuggestionService';

/**
 * Service for checking drug interactions between medications
 * Singleton implementation to ensure the interaction database is initialized only once
 */
export class DrugInteractionService {
    private static instance: DrugInteractionService;
    private interactionDatabase: Map<string, Array<{drug: string, severity: InteractionSeverity, description: string}>>;
    private initialized: boolean = false;
    
    /**
     * Get the singleton instance of DrugInteractionService
     */
    public static getInstance(): DrugInteractionService {
        if (!DrugInteractionService.instance) {
            DrugInteractionService.instance = new DrugInteractionService();
        }
        return DrugInteractionService.instance;
    }
    
    constructor() {
        // Use singleton pattern to prevent multiple initializations
        if (DrugInteractionService.instance) {
            return DrugInteractionService.instance;
        }
        
        // Initialize a comprehensive interaction database
        this.interactionDatabase = new Map();
        this.initializeInteractionDatabase();
        DrugInteractionService.instance = this;
    }
    
    /**
     * Check for interactions between a medication and a list of current medications
     * @param medication The medication to check
     * @param currentMedications List of medications the patient is currently taking
     * @returns Array of interaction risk assessments
     */
    async checkInteractions(
        medication: string,
        currentMedications: string[]
    ): Promise<DrugInteractionRisk[]> {
        try {
            // Ensure the database is initialized
            if (!this.initialized) {
                await this.initializeInteractionDatabase();
            }
            
            logger.info(`Checking interactions for ${medication} with ${currentMedications.length} current medications`);
            
            const results: DrugInteractionRisk[] = [];
            
            // Normalize the medication name
            const normalizedMed = this.normalizeMedicationName(medication);
            
            // First check known interactions from our database
            for (const currentMed of currentMedications) {
                const normalizedCurrentMed = this.normalizeMedicationName(currentMed);
                const knownInteraction = this.checkKnownInteraction(normalizedMed, normalizedCurrentMed);
                
                if (knownInteraction) {
                    results.push(knownInteraction);
                }
            }
            
            // If we have fewer than 3 results from our database, use AI to check additional interactions
            if (results.length < 3 && currentMedications.length > 0) {
                const aiInteractions = await this.generateAIInteractionCheck(medication, currentMedications);
                
                // Deduplicate interactions
                for (const aiInteraction of aiInteractions) {
                    // Check if this interaction is already in our results
                    const isDuplicate = results.some(result => 
                        result.medications.includes(aiInteraction.medications[0]) && 
                        result.medications.includes(aiInteraction.medications[1])
                    );
                    
                    if (!isDuplicate) {
                        results.push(aiInteraction);
                    }
                }
            }
            
            return results;
        } catch (error) {
            logger.error('Error checking drug interactions:', error);
            return [];
        }
    }
    
    /**
     * Initialize a comprehensive interaction database with common drugs and their interactions
     * This uses a more structured format with severity and descriptions
     */
    private async initializeInteractionDatabase(): Promise<void> {
        if (this.initialized) return;
        
        try {
            // Common drug interactions with severity levels and descriptions
            const interactionData: Array<{
                drug: string, 
                interactsWith: Array<{
                    drug: string, 
                    severity: InteractionSeverity, 
                    description: string
                }>
            }> = [
                {
                    drug: 'warfarin',
                    interactsWith: [
                        { 
                            drug: 'aspirin', 
                            severity: InteractionSeverity.HIGH, 
                            description: 'Increased risk of bleeding' 
                        },
                        { 
                            drug: 'ibuprofen', 
                            severity: InteractionSeverity.HIGH, 
                            description: 'Increased risk of GI bleeding' 
                        },
                        { 
                            drug: 'clopidogrel', 
                            severity: InteractionSeverity.HIGH, 
                            description: 'Increased risk of major bleeding' 
                        },
                        { 
                            drug: 'naproxen', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'May increase bleeding risk' 
                        }
                    ]
                },
                {
                    drug: 'simvastatin',
                    interactsWith: [
                        { 
                            drug: 'clarithromycin', 
                            severity: InteractionSeverity.HIGH, 
                            description: 'Increased risk of myopathy and rhabdomyolysis' 
                        },
                        { 
                            drug: 'itraconazole', 
                            severity: InteractionSeverity.HIGH, 
                            description: 'Increased risk of myopathy and rhabdomyolysis' 
                        },
                        { 
                            drug: 'cyclosporine', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'Increased simvastatin exposure' 
                        }
                    ]
                },
                {
                    drug: 'lisinopril',
                    interactsWith: [
                        { 
                            drug: 'spironolactone', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'Risk of hyperkalemia' 
                        },
                        { 
                            drug: 'potassium supplements', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'Risk of hyperkalemia' 
                        }
                    ]
                },
                {
                    drug: 'digoxin',
                    interactsWith: [
                        { 
                            drug: 'amiodarone', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'Increased digoxin levels' 
                        },
                        { 
                            drug: 'verapamil', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'Increased digoxin levels' 
                        },
                        { 
                            drug: 'clarithromycin', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'Increased risk of digoxin toxicity' 
                        }
                    ]
                },
                {
                    drug: 'metformin',
                    interactsWith: [
                        { 
                            drug: 'contrast media', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'Risk of lactic acidosis' 
                        },
                        { 
                            drug: 'alcohol', 
                            severity: InteractionSeverity.LOW, 
                            description: 'Potential for hypoglycemia' 
                        }
                    ]
                },
                {
                    drug: 'levothyroxine',
                    interactsWith: [
                        { 
                            drug: 'calcium supplements', 
                            severity: InteractionSeverity.LOW, 
                            description: 'Reduced levothyroxine absorption' 
                        },
                        { 
                            drug: 'iron supplements', 
                            severity: InteractionSeverity.LOW, 
                            description: 'Reduced levothyroxine absorption' 
                        }
                    ]
                },
                {
                    drug: 'fluoxetine',
                    interactsWith: [
                        { 
                            drug: 'tramadol', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'Increased risk of serotonin syndrome' 
                        },
                        { 
                            drug: 'monoamine oxidase inhibitors', 
                            severity: InteractionSeverity.HIGH, 
                            description: 'Risk of serotonin syndrome' 
                        }
                    ]
                },
                {
                    drug: 'amoxicillin',
                    interactsWith: [
                        { 
                            drug: 'allopurinol', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'Increased risk of rash' 
                        }
                    ]
                },
                {
                    drug: 'ciprofloxacin',
                    interactsWith: [
                        { 
                            drug: 'antacids', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'Reduced ciprofloxacin absorption' 
                        },
                        { 
                            drug: 'calcium supplements', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'Reduced ciprofloxacin absorption' 
                        },
                        { 
                            drug: 'iron supplements', 
                            severity: InteractionSeverity.MEDIUM, 
                            description: 'Reduced ciprofloxacin absorption' 
                        }
                    ]
                }
            ];
            
            // Populate the interaction database
            for (const drug of interactionData) {
                const interactions = drug.interactsWith.map(interaction => ({
                    drug: interaction.drug,
                    severity: interaction.severity,
                    description: interaction.description
                }));
                
                this.interactionDatabase.set(drug.drug, interactions);
            }
            
            this.initialized = true;
            logger.info('Drug interaction database initialized successfully');
        } catch (error) {
            logger.error('Error initializing drug interaction database:', error);
            throw error;
        }
    }
    
    /**
     * Normalize medication names for more reliable matching
     */
    private normalizeMedicationName(medication: string): string {
        return medication
            .toLowerCase()
            .trim()
            // Remove common drug formulation suffixes
            .replace(/(tablet|capsule|injection|solution|suspension|suppository|patch|cream|ointment|gel)s?$/i, '')
            .replace(/\d+\s*mg$/i, '') // Remove dosage
            .trim();
    }
    
    /**
     * Check if there's a known interaction between two medications
     */
    private checkKnownInteraction(
        medication: string,
        currentMedication: string
    ): DrugInteractionRisk | null {
        // Get direct interactions from medication to currentMedication
        const directInteractions = this.interactionDatabase.get(medication) || [];
        const directInteraction = directInteractions.find(
            interaction => this.medicationsMatch(interaction.drug, currentMedication)
        );
        
        if (directInteraction) {
            return {
                severity: directInteraction.severity,
                description: directInteraction.description,
                medications: [medication, currentMedication],
                evidenceLevel: 'strong'
            };
        }
        
        // Check for reverse interactions (currentMedication to medication)
        for (const [drug, interactions] of this.interactionDatabase.entries()) {
            if (this.medicationsMatch(drug, currentMedication)) {
                const reverseInteraction = interactions.find(
                    interaction => this.medicationsMatch(interaction.drug, medication)
                );
                
                if (reverseInteraction) {
                    return {
                        severity: reverseInteraction.severity,
                        description: reverseInteraction.description,
                        medications: [currentMedication, medication],
                        evidenceLevel: 'strong'
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * Check if two medication names match, considering partial matches and generic/brand names
     */
    private medicationsMatch(med1: string, med2: string): boolean {
        // Exact match
        if (med1 === med2) return true;
        
        // Look for substring match (for drugs with multiple forms)
        if (med1.includes(med2) || med2.includes(med1)) return true;
        
        // TODO: In a production environment, use a proper medication database
        // that maps brand names to generic names
        
        return false;
    }
    
    /**
     * Use AI to check for potential drug interactions
     * This would supplement a formal drug interaction database in a real application
     */
    private async generateAIInteractionCheck(
        medication: string,
        currentMedications: string[]
    ): Promise<DrugInteractionRisk[]> {
        try {
            if (currentMedications.length === 0) {
                return [];
            }
            
            const prompt = `
                As a clinical pharmacologist, please analyze potential drug interactions between ${medication} and the following medications:
                ${currentMedications.join(', ')}
                
                For each potential interaction, provide the following information in this format:
                
                Medication 1 | Medication 2 | Severity (high, medium, or low) | Description
                
                Only include interactions with clinical significance. If there are no interactions, state "No significant interactions found."
            `;
            
            const response = await aiService.analyzeMedicalReport(prompt);
            
            // Parse the AI response to extract interactions
            return this.parseAIInteractionResponse(response.analysis || '', medication, currentMedications);
        } catch (error) {
            logger.error('Error generating AI interaction check:', error);
            return [];
        }
    }
    
    /**
     * Parse the AI response to extract structured interaction data
     */
    private parseAIInteractionResponse(
        response: string,
        medication: string,
        currentMedications: string[]
    ): DrugInteractionRisk[] {
        const interactions: DrugInteractionRisk[] = [];
        
        try {
            // Check if AI reported no interactions
            if (response.toLowerCase().includes('no significant interactions') || 
                response.toLowerCase().includes('no interactions found')) {
                return [];
            }
            
            // Try to parse table format first
            const tablePattern = /([^\|\n]+)\s*\|\s*([^\|\n]+)\s*\|\s*([^\|\n]+)\s*\|\s*([^\|\n]+)/g;
            let match;
            
            while ((match = tablePattern.exec(response)) !== null) {
                // Extract the components
                const [_, drug1, drug2, severityText, description] = match;
                
                if (drug1 && drug2 && severityText && description) {
                    // Determine interaction severity
                    let severity: InteractionSeverity;
                    const severityLower = severityText.trim().toLowerCase();
                    
                    if (severityLower.includes('high') || severityLower.includes('severe')) {
                        severity = InteractionSeverity.HIGH;
                    } else if (severityLower.includes('low') || severityLower.includes('mild')) {
                        severity = InteractionSeverity.LOW;
                    } else {
                        severity = InteractionSeverity.MEDIUM;
                    }
                    
                    interactions.push({
                        severity,
                        description: description.trim(),
                        medications: [drug1.trim(), drug2.trim()],
                        evidenceLevel: 'moderate'
                    });
                }
            }
            
            // If table parsing failed, try alternative parsing
            if (interactions.length === 0) {
                // Split by lines or sections
                const lines = response.split(/\n{2,}/).flatMap(section => section.split('\n'));
                
                for (const line of lines) {
                    // Look for mentions of severity
                    const severityMatch = line.match(/\b(high|medium|low|severe|mild|moderate)\b\s+(?:risk|severity|interaction)/i);
                    
                    if (severityMatch) {
                        // Find which medications this line is talking about
                        const meds = this.findMedicationsInText(line, [medication, ...currentMedications]);
                        
                        if (meds.length >= 2) {
                            // Determine severity
                            let severity: InteractionSeverity;
                            const severityText = severityMatch[1].toLowerCase();
                            
                            if (severityText.includes('high') || severityText.includes('severe')) {
                                severity = InteractionSeverity.HIGH;
                            } else if (severityText.includes('low') || severityText.includes('mild')) {
                                severity = InteractionSeverity.LOW;
                            } else {
                                severity = InteractionSeverity.MEDIUM;
                            }
                            
                            interactions.push({
                                severity,
                                description: line.trim(),
                                medications: [meds[0], meds[1]],
                                evidenceLevel: 'weak'
                            });
                        }
                    }
                }
            }
            
            return interactions;
        } catch (error) {
            logger.error('Error parsing AI interaction response:', error);
            return [];
        }
    }
    
    /**
     * Find which medications from a list are mentioned in a text
     */
    private findMedicationsInText(text: string, medications: string[]): string[] {
        const mentionedMeds: string[] = [];
        const normalizedText = text.toLowerCase();
        
        for (const med of medications) {
            if (normalizedText.includes(med.toLowerCase())) {
                mentionedMeds.push(med);
            }
        }
        
        return mentionedMeds;
    }
    
    /**
     * Update the interaction database with new interaction data
     * This would typically be called on a schedule to keep the database up to date
     */
    public async updateInteractionDatabase(): Promise<void> {
        // In a real application, this would fetch the latest interaction data
        // from a medical API or database
        logger.info('Drug interaction database update scheduled');
    }
} 