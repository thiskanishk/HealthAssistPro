export interface SymptomAnalysisInput {
    age: number;
    gender: string;
    primarySymptoms: string[];
    duration: string;
    severityLevel: number;
    vitalSigns?: {
        bloodPressure: string;
        heartRate: number;
        temperature: number;
        respiratoryRate: number;
    };
    medicalHistory: {
        conditions: string[];
        medications: string[];
        allergies: string[];
    };
    additionalNotes: string;
} 