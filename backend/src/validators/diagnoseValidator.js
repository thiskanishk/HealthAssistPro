
const Joi = require('joi');

const diagnoseSchema = Joi.object({
  patientId: Joi.string().required(),
  symptoms: Joi.array().items(Joi.string().max(100)).min(1).required(),
  vitals: Joi.object({
    temperature: Joi.number().optional(),
    heartRate: Joi.number().optional(),
    oxygenSaturation: Joi.number().optional()
  }).optional(),
  notes: Joi.string().max(1000).allow('').optional()
});

function validateDiagnosis(req, res, next) {
  const { error } = diagnoseSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({ message: 'Invalid input', details: error.details });
  }
  next();
}

module.exports = validateDiagnosis;
