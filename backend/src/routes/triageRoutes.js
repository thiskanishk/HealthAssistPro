const express = require('express');
const router = express.Router();
const triageService = require('../services/triageService');
const { verifyToken, isDoctor, isNurse } = require('../middleware/auth');

// Get all triage assessments
router.get('/assessments', verifyToken, async (req, res) => {
  try {
    const assessments = await triageService.getWaitingList();
    res.json(assessments);
  } catch (error) {
    console.error('Error fetching triage assessments:', error);
    res.status(500).json({ error: 'Failed to fetch triage assessments' });
  }
});

// Create new triage assessment
router.post('/assessments', verifyToken, async (req, res) => {
  try {
    const assessment = await triageService.assessPatient(req.body);
    res.status(201).json(assessment);
  } catch (error) {
    console.error('Error creating triage assessment:', error);
    if (error.message === 'Patient not found') {
      res.status(404).json({ error: 'Patient not found' });
    } else {
      res.status(500).json({ error: 'Failed to create triage assessment' });
    }
  }
});

// Get specific triage assessment
router.get('/assessments/:id', verifyToken, async (req, res) => {
  try {
    const assessment = await triageService.getAssessmentById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json(assessment);
  } catch (error) {
    console.error('Error fetching triage assessment:', error);
    res.status(500).json({ error: 'Failed to fetch triage assessment' });
  }
});

// Update nurse review
router.post('/assessments/:id/review', verifyToken, isNurse, async (req, res) => {
  try {
    const { id } = req.params;
    const nurseData = {
      reviewedBy: req.user.id,
      adjustedTriageLevel: req.body.adjustedTriageLevel,
      notes: req.body.notes
    };

    const updatedAssessment = await triageService.updateNurseReview(id, nurseData);
    if (!updatedAssessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json(updatedAssessment);
  } catch (error) {
    console.error('Error updating nurse review:', error);
    res.status(500).json({ error: 'Failed to update nurse review' });
  }
});

// Complete triage assessment
router.post('/assessments/:id/complete', verifyToken, isNurse, async (req, res) => {
  try {
    const { id } = req.params;
    const completedAssessment = await triageService.completeAssessment(id, req.user.id);
    if (!completedAssessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json(completedAssessment);
  } catch (error) {
    console.error('Error completing assessment:', error);
    res.status(500).json({ error: 'Failed to complete assessment' });
  }
});

// Get triage statistics
router.get('/statistics', verifyToken, async (req, res) => {
  try {
    const stats = await triageService.getTriageStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching triage statistics:', error);
    res.status(500).json({ error: 'Failed to fetch triage statistics' });
  }
});

// Get average wait times
router.get('/wait-times', verifyToken, async (req, res) => {
  try {
    const waitTimes = await triageService.getAverageWaitTimes();
    res.json(waitTimes);
  } catch (error) {
    console.error('Error fetching wait times:', error);
    res.status(500).json({ error: 'Failed to fetch wait times' });
  }
});

module.exports = router; 