
const openAIService = require('../services/openAIService');
const Patient = require('../models/Patient');
const Diagnosis = require('../models/Diagnosis');

exports.analyzePatientHistory = async (req, res) => {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ message: 'Patient ID is required' });

    const patient = await Patient.findById(patientId);
    const history = await Diagnosis.find({ patientId }).sort({ createdAt: -1 });

    if (!patient || history.length === 0) {
      return res.status(404).json({ message: 'No history found for this patient' });
    }

    const formattedHistory = history.map(h => ({
      condition: h.results[0]?.condition || '',
      confidence: h.results[0]?.confidence || 0,
      submittedSymptoms: h.submittedSymptoms,
      timestamp: h.createdAt
    }));

    const prompt = `
Patient: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}
History:
${formattedHistory.map(entry => `
Date: ${new Date(entry.timestamp).toLocaleDateString()}
Symptoms: ${entry.submittedSymptoms.join(', ')}
Diagnosis: ${entry.condition} (Confidence: ${entry.confidence})
`).join('
')}

Analyze the pattern in this patient's vitals, diagnosis frequency, and any missed follow-ups. Return 2-3 key insights.
    `;

    const response = await openAIService.sendToGPT4(prompt, req.user._id);
    res.json({ summary: response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'AI analysis failed', error: err.message });
  }
};
