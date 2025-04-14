
/**
 * Utility to sanitize and build prompts for GPT-4 diagnosis.
 */
function sanitizeInput(data) {
  const sanitized = { ...data };
  delete sanitized.name;
  delete sanitized.email;
  delete sanitized.contact;
  if (sanitized.notes) {
    sanitized.notes = sanitized.notes.replace(/(\bName:.*|Email:.*|Phone:.*)/gi, '[REDACTED]');
  }
  return sanitized;
}

function buildPrompt(sanitized) {
  return `Patient Profile:
- Age: ${sanitized.age}
- Gender: ${sanitized.gender}
- Symptoms: ${sanitized.symptoms?.join(', ')}
- Medical History: ${sanitized.medicalHistory?.join(', ') || 'None'}
- Vitals: Temp ${sanitized.vitals?.temperature}°F, HR ${sanitized.vitals?.heartRate} bpm, SpO₂ ${sanitized.vitals?.oxygenSaturation}%
- Notes: ${sanitized.notes || 'N/A'}

Task:
1. List top 3 most likely diagnoses with confidence scores (0–1 scale).
2. Provide a treatment plan including medications and lifestyle changes.
3. Include ICD-10 codes if available.`;
}

module.exports = {
  sanitizeInput,
  buildPrompt,
};
