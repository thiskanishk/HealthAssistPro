# AI Integration Guide

## OpenAI Integration

### Configuration
```typescript
// OpenAI client setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 30000
});

// Model configuration
const modelConfig = {
  diagnosis: {
    model: 'gpt-4',
    temperature: 0.3,
    maxTokens: 2000
  },
  prescription: {
    model: 'gpt-4',
    temperature: 0.2,
    maxTokens: 1500
  }
};
```

### Prompt Engineering
```typescript
// Diagnosis prompt template
const buildDiagnosisPrompt = (symptoms: string[], patientHistory: PatientHistory) => `
Analyze the following patient symptoms and medical history:

Symptoms:
${symptoms.join('\n')}

Medical History:
${formatPatientHistory(patientHistory)}

Provide:
1. Potential diagnoses with confidence levels
2. Recommended tests
3. Treatment suggestions
4. Risk factors
5. Follow-up recommendations
`;
```

### Response Processing
```typescript
// Process AI response
const processAIResponse = (response: any) => {
  const { diagnoses, confidence, recommendations } = response;
  
  // Validate confidence levels
  const validatedDiagnoses = diagnoses.filter(d => d.confidence > 0.5);
  
  // Format recommendations
  const formattedRecommendations = recommendations.map(formatRecommendation);
  
  return {
    diagnoses: validatedDiagnoses,
    recommendations: formattedRecommendations,
    confidence
  };
};
```

## Error Handling
```typescript
// AI service error handling
const handleAIError = async (error: any) => {
  if (error.response?.status === 429) {
    // Rate limit exceeded
    await delay(1000);
    return retry(operation);
  }
  
  if (error.response?.status === 500) {
    // AI service error
    return fallbackAnalysis();
  }
  
  throw error;
};
``` 