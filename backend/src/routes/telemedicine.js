const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const telemedicineService = require('../services/telemedicineService');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const TelemedicineSession = require('../models/TelemedicineSession');
const User = require('../models/User');

// Schedule a new telemedicine session
router.post('/sessions',
  verifyToken,
  authorize(['doctor', 'nurse']),
  [
    body('patientId').isMongoId(),
    body('scheduledTime').isISO8601(),
    body('type').isIn(['initial_consultation', 'follow_up', 'emergency', 'specialist_consultation']),
    body('priority').optional().isInt({ min: 1, max: 5 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { patientId, scheduledTime, type, priority } = req.body;
      const session = await telemedicineService.createSession(
        patientId,
        req.user.id,
        new Date(scheduledTime),
        type
      );

      res.status(201).json(session);
    } catch (error) {
      console.error('Error scheduling telemedicine session:', error);
      res.status(500).json({ message: 'Failed to schedule session' });
    }
  }
);

// Get doctor's schedule for a specific date
router.get('/schedule',
  verifyToken,
  authorize(['doctor']),
  [
    query('date').isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const schedule = await telemedicineService.getDoctorSchedule(
        req.user.id,
        new Date(req.query.date)
      );

      res.json(schedule);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      res.status(500).json({ message: 'Failed to fetch schedule' });
    }
  }
);

// Get waiting room status
router.get('/waiting-room',
  verifyToken,
  authorize(['doctor']),
  async (req, res) => {
    try {
      const waitingPatients = await telemedicineService.getWaitingRoomStatus(req.user.id);
      res.json(waitingPatients);
    } catch (error) {
      console.error('Error fetching waiting room status:', error);
      res.status(500).json({ message: 'Failed to fetch waiting room status' });
    }
  }
);

// Update session status
router.patch('/sessions/:sessionId/status',
  verifyToken,
  authorize(['doctor']),
  [
    param('sessionId').isUUID(4),
    body('status').isIn(['in_progress', 'completed', 'cancelled'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sessionId } = req.params;
      const { status } = req.body;

      if (status === 'in_progress') {
        await telemedicineService.startSession(sessionId);
      } else if (status === 'completed') {
        await telemedicineService.endSession(sessionId);
      }

      res.json({ message: 'Session status updated successfully' });
    } catch (error) {
      console.error('Error updating session status:', error);
      res.status(500).json({ message: 'Failed to update session status' });
    }
  }
);

// Update session notes
router.patch('/sessions/:sessionId/notes',
  verifyToken,
  authorize(['doctor']),
  [
    param('sessionId').isUUID(4),
    body('doctorNotes').optional().isString(),
    body('symptoms').optional().isArray(),
    body('diagnosis').optional().isString(),
    body('followUpNeeded').optional().isBoolean(),
    body('followUpDate').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const session = await TelemedicineSession.findOne({
        sessionId: req.params.sessionId,
        doctorId: req.user.id
      });

      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }

      Object.assign(session.notes, req.body);
      await session.save();

      res.json({ message: 'Session notes updated successfully' });
    } catch (error) {
      console.error('Error updating session notes:', error);
      res.status(500).json({ message: 'Failed to update session notes' });
    }
  }
);

// Get session recording
router.get('/sessions/:sessionId/recording',
  verifyToken,
  authorize(['doctor', 'patient']),
  [
    param('sessionId').isUUID(4)
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const recordingUrl = await telemedicineService.getSessionRecording(req.params.sessionId);
      res.json({ recordingUrl });
    } catch (error) {
      console.error('Error fetching session recording:', error);
      res.status(500).json({ message: 'Failed to fetch session recording' });
    }
  }
);

// Report technical issue
router.post('/sessions/:sessionId/technical-issue',
  verifyToken,
  [
    param('sessionId').isUUID(4),
    body('issue').isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await telemedicineService.recordTechnicalIssue(
        req.params.sessionId,
        req.body.issue
      );

      res.json({ message: 'Technical issue recorded successfully' });
    } catch (error) {
      console.error('Error recording technical issue:', error);
      res.status(500).json({ message: 'Failed to record technical issue' });
    }
  }
);

// Get current appointment for user
router.get('/current-appointment/:userId', verifyToken, async (req, res) => {
  try {
    const appointment = await TelemedicineSession.findOne({
      $or: [
        { patientId: req.params.userId },
        { doctorId: req.params.userId }
      ],
      status: 'scheduled',
      dateTime: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 60 * 1000) // Next 30 minutes
      }
    }).populate('doctorId', 'name');

    if (!appointment) {
      return res.status(404).json({ message: 'No upcoming appointments found' });
    }

    res.json({
      _id: appointment._id,
      doctorName: appointment.doctorId.name,
      startTime: appointment.dateTime,
      estimatedWaitTime: appointment.estimatedWaitTime || 0
    });
  } catch (err) {
    console.error('Error fetching current appointment:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Network speed test endpoint
router.get('/network-test', (req, res) => {
  // Send a response with random data to simulate network test
  const data = Buffer.alloc(1024 * 10); // 10KB of data
  res.send(data);
});

// Update appointment status
router.patch('/appointments/:appointmentId/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await TelemedicineSession.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify user is part of the session
    if (appointment.patientId.toString() !== req.user.id && 
        appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    appointment.status = status;
    await appointment.save();

    res.json(appointment);
  } catch (err) {
    console.error('Error updating appointment status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system requirements status
router.get('/system-check', verifyToken, async (req, res) => {
  try {
    // In a real application, you might want to check:
    // - User's connection quality
    // - Server capacity
    // - Any maintenance windows
    res.json({
      minimumBandwidth: 1, // Mbps
      recommendedBandwidth: 2, // Mbps
      requiredBrowser: ['Chrome', 'Firefox', 'Safari', 'Edge'],
      features: {
        webRTC: true,
        mediaDevices: true,
        screenSharing: true
      }
    });
  } catch (err) {
    console.error('Error checking system requirements:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update estimated wait time
router.patch('/appointments/:appointmentId/wait-time', verifyToken, async (req, res) => {
  try {
    const { estimatedWaitTime } = req.body;
    const appointment = await TelemedicineSession.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Only doctors can update wait time
    if (appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    appointment.estimatedWaitTime = estimatedWaitTime;
    await appointment.save();

    res.json(appointment);
  } catch (err) {
    console.error('Error updating wait time:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 