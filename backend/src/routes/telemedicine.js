const express = require('express');
const router = express.Router();
const { submitDiagnosis } = require('../services/telemedicineService');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/diagnose', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'Doctor') {
      return res.status(403).json({ message: 'Only doctors can submit diagnoses.' });
    }

    const results = await submitDiagnosis(req.body, user);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
