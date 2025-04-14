
const express = require('express');
const router = express.Router();
const analyzeController = require('../controllers/analyzeController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post('/analyze-history',
  authMiddleware,
  roleMiddleware(['Doctor']),
  analyzeController.analyzePatientHistory
);

module.exports = router;
