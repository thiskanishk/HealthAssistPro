import { aiService } from '../AIServiceManager';

export class MedicalResearchAssistant {
  async findRelevantStudies(
    condition: string,
    treatment: string
  ) {
    const prompt = `Find relevant medical research for:
      Condition: ${condition}
      Treatment: ${treatment}
      
      Include:
      1. Recent clinical trials
      2. Treatment efficacy studies
      3. Side effect research
      4. Comparative studies
      5. Meta-analyses`;

    return aiService.generateCompletion(prompt, {
      temperature: 0.2,
      maxTokens: 1000,
    });
  }

  async summarizeResearch(researchText: string) {
    const prompt = `Summarize this medical research:
      ${researchText}
      
      Provide:
      1. Key findings
      2. Methodology overview
      3. Clinical implications
      4. Limitations
      5. Practical applications`;

    return aiService.generateCompletion(prompt, {
      temperature: 0.3,
      maxTokens: 800,
    });
  }
} 