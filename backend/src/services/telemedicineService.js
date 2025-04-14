
const Queue = require('bull');
const AuditLog = require('../models/AuditLog');
const { sanitizeInput } = require('../utils/promptBuilder');

const gptQueue = new Queue('gpt-queue', {
  redis: { host: 'localhost', port: 6379 }
});

async function submitDiagnosis(patientData, user) {
  const sanitized = sanitizeInput(patientData);

  // Log the prompt event for audit purposes
  await AuditLog.create({
    action: 'DIAGNOSE_ENQUEUED',
    userId: user._id,
    patientId: patientData.patientId,
    metadata: { symptoms: patientData.symptoms, notes: patientData.notes },
    timestamp: new Date(),
  });

  await gptQueue.add({ patientData: sanitized, userId: user._id });

  return { message: 'Diagnosis request submitted. You will be notified when complete.' };
}

module.exports = {
  submitDiagnosis,
};
