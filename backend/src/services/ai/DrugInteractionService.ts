import { aiService } from './AIServiceManager';
import logger from '../../utils/logger';

/**
 * Service for checking drug interactions between medications
 */
export class DrugInteractionService {
    private interactionDatabase: Map<string, string[]>;
    
    constructor() {
        // Initialize a simple interaction database
        // In a real application, this would connect to a comprehensive drug interaction API
        this.interactionDatabase = new Map();
        this.initializeInteractionDatabase();
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
    ): Promise<Array<{
        severity: 'high' | 'medium' | 'low';
        description: string;
        medications: string[];
    }>> {
        try {
            logger.info(`Checking interactions for ${medication} with ${currentMedications.length} current medications`);
            
            const results: Array<{
                severity: 'high' | 'medium' | 'low';
                description: string;
                medications: string[];
            }> = [];
            
            // For demonstration, check our simple database first
            for (const currentMed of currentMedications) {
                const knownInteraction = this.checkKnownInteraction(medication, currentMed);
                if (knownInteraction) {
                    results.push(knownInteraction);
                }
            }
            
            // If we have results from our database, return them
            if (results.length > 0) {
                return results;
            }
            
            // Otherwise, use AI to generate potential interactions
            // This would be supplementary to a real drug interaction database in production
            return this.generateAIInteractionCheck(medication, currentMedications);
        } catch (error) {
            logger.error('Error checking drug interactions:', error);
            return [];
        }
    }
    
    /**
     * Initialize a simple interaction database with common drugs and their interactions
     * In a real system, this would be loaded from a comprehensive medical database
     */
    private initializeInteractionDatabase() {
        // Common drug interactions (simplified for demonstration)
        this.interactionDatabase.set('warfarin', ['aspirin', 'ibuprofen', 'naproxen', 'clopidogrel']);
        this.interactionDatabase.set('simvastatin', ['clarithromycin', 'itraconazole', 'cyclosporine']);
        this.interactionDatabase.set('lisinopril', ['spironolactone', 'potassium supplements']);
        this.interactionDatabase.set('digoxin', ['amiodarone', 'verapamil', 'clarithromycin']);
        this.interactionDatabase.set('metformin', ['contrast media', 'alcohol']);
        this.interactionDatabase.set('levothyroxine', ['calcium supplements', 'iron supplements']);
    }
    
    /**
     * Check if there's a known interaction between two medications
     */
    private checkKnownInteraction(
        medication: string,
        currentMedication: string
    ): { severity: 'high' | 'medium' | 'low'; description: string; medications: string[] } | null {
        // Normalize medication names for comparison
        const normalizedMed = medication.toLowerCase().trim();
        const normalizedCurrent = currentMedication.toLowerCase().trim();
        
        // Check if either medication interacts with the other
        const interactsWith = this.interactionDatabase.get(normalizedMed) || [];
        const isInteractedBy = [];
        
        for (const [drug, interactions] of this.interactionDatabase.entries()) {
            if (interactions.includes(normalizedMed) && drug === normalizedCurrent) {
                isInteractedBy.push(drug);
            }
        }
        
        if (interactsWith.includes(normalizedCurrent) || isInteractedBy.length > 0) {
            return {
                severity: this.determineInteractionSeverity(normalizedMed, normalizedCurrent),
                description: `Potential interaction between ${medication} and ${currentMedication}`,
                medications: [medication, currentMedication]
            };
        }
        
        return null;
    }
    
    /**
     * Determine the severity of an interaction based on the medications involved
     * In a real system, this would use comprehensive medical data
     */
    private determineInteractionSeverity(med1: string, med2: string): 'high' | 'medium' | 'low' {
        // Simple logic for demonstration
        // High-risk combinations
        const highRiskPairs = [
            ['warfarin', 'aspirin'],
            ['warfarin', 'clopidogrel'],
            ['simvastatin', 'clarithromycin']
        ];
        
        // Check if this combination is high risk
        for (const [drug1, drug2] of highRiskPairs) {
            if ((med1 === drug1 && med2 === drug2) || (med1 === drug2 && med2 === drug1)) {
                return 'high';
            }
        }
        
        // Default to medium risk for known interactions
        return 'medium';
    }
    
    /**
     * Use AI to check for potential drug interactions
     * This would supplement a formal drug interaction database in a real application
     */
    private async generateAIInteractionCheck(
        medication: string,
        currentMedications: string[]
    ): Promise<Array<{ severity: 'high' | 'medium' | 'low'; description: string; medications: string[] }>> {
        try {
            if (currentMedications.length === 0) {
                return [];
            }
            
            const prompt = `
                Please analyze potential drug interactions between ${medication} and the following medications:
                ${currentMedications.join(', ')}
                
                For each potential interaction, provide:
                1. The medications involved
                2. The severity (high, medium, or low)
                3. A brief description of the interaction
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
    ): Array<{ severity: 'high' | 'medium' | 'low'; description: string; medications: string[] }> {
        const interactions: Array<{
            severity: 'high' | 'medium' | 'low';
            description: string;
            medications: string[];
        }> = [];
        
        try {
            // Split the response by sections or lines
            const lines = response.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                // Look for mentions of medications and severity
                for (const currentMed of currentMedications) {
                    if (line.toLowerCase().includes(currentMed.toLowerCase()) &&
                        line.toLowerCase().includes(medication.toLowerCase())) {
                        
                        // Determine severity from the text
                        let severity: 'high' | 'medium' | 'low' = 'medium';
                        if (line.toLowerCase().includes('high') || line.toLowerCase().includes('severe') || 
                            line.toLowerCase().includes('dangerous')) {
                            severity = 'high';
                        } else if (line.toLowerCase().includes('low') || line.toLowerCase().includes('mild') || 
                                 line.toLowerCase().includes('minimal')) {
                            severity = 'low';
                        }
                        
                        interactions.push({
                            severity,
                            description: line.trim(),
                            medications: [medication, currentMed]
                        });
                        
                        // Break after finding an interaction for this medication
                        break;
                    }
                }
            }
            
            return interactions;
        } catch (error) {
            logger.error('Error parsing AI interaction response:', error);
            return [];
        }
    }
} 