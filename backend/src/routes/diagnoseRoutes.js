
const express = require('express');
const diagnoseRateLimiter = require('../middlewares/rateLimiter');
const router = express.Router();
const diagnoseController = require('../controllers/diagnoseController');
const validateDiagnosis = require('../validators/diagnoseValidator');

// POST /api/v1/diagnose
router.post('/', validateDiagnosis, diagnoseController.diagnose);
router.post('/', diagnoseRateLimiter, validateDiagnosis, diagnoseController.diagnose);

module.exports = router;


router.post('/async', validateDiagnosis, diagnoseController.submitDiagnosisAsync);
router.get('/:jobId/status', diagnoseController.getDiagnosisStatus);
