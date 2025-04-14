const express = require('express');
const router = express.Router();
const analyzeController = require('../controllers/analyzeController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/analyze-history',
  authMiddleware,
  roleMiddleware(['Doctor']),
  analyzeController.analyzePatientHistory
);

module.exports = router;
