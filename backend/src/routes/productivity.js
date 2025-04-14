const express = require('express');
const { verifyToken, authorize } = require('../middleware/auth');
const Task = require('../models/Task');
const VisitTimer = require('../models/VisitTimer');
const router = express.Router();

// Get tasks for a user
router.get('/tasks', verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id })
      .sort({ dueDate: 1 })
      .populate('patientId', 'firstName lastName');

    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Create a new task
router.post('/tasks', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      dueDate,
      category,
      patientId,
      patientName
    } = req.body;

    const task = new Task({
      title,
      description,
      priority,
      dueDate,
      category,
      patientId,
      patientName,
      userId: req.user.id,
      completed: false
    });

    await task.save();
    res.status(201).json({ task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// Update a task
router.patch('/tasks/:taskId', verifyToken, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      userId: req.user.id
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const updates = req.body;
    Object.keys(updates).forEach((key) => {
      task[key] = updates[key];
    });

    await task.save();
    res.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

// Delete a task
router.delete('/tasks/:taskId', verifyToken, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.taskId,
      userId: req.user.id
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

// Save visit timer data
router.post('/visit-timers', [verifyToken, authorize(['doctor', 'nurse'])], async (req, res) => {
  try {
    const {
      patientId,
      startTime,
      endTime,
      duration,
      notes,
      overTime
    } = req.body;

    const visitTimer = new VisitTimer({
      patientId,
      providerId: req.user.id,
      startTime,
      endTime,
      duration,
      notes,
      overTime
    });

    await visitTimer.save();

    // Update patient's last visit time
    await Patient.findByIdAndUpdate(patientId, {
      lastVisitAt: endTime
    });

    res.status(201).json({ visitTimer });
  } catch (error) {
    console.error('Error saving visit timer:', error);
    res.status(500).json({ message: 'Failed to save visit timer' });
  }
});

// Get visit history for a patient
router.get('/visit-timers/:patientId', [verifyToken, authorize(['doctor', 'nurse'])], async (req, res) => {
  try {
    const visitTimers = await VisitTimer.find({
      patientId: req.params.patientId
    })
      .sort({ startTime: -1 })
      .populate('providerId', 'firstName lastName role');

    res.json({ visitTimers });
  } catch (error) {
    console.error('Error fetching visit timers:', error);
    res.status(500).json({ message: 'Failed to fetch visit timers' });
  }
});

// Get visit statistics
router.get('/visit-stats', [verifyToken, authorize(['admin', 'doctor'])], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {
      startTime: {
        $gte: new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
        $lte: new Date(endDate || Date.now())
      }
    };

    if (req.user.role !== 'admin') {
      query.providerId = req.user.id;
    }

    const stats = await VisitTimer.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          averageDuration: { $avg: '$duration' },
          overtimeVisits: {
            $sum: { $cond: ['$overTime', 1, 0] }
          }
        }
      }
    ]);

    res.json(stats[0] || {
      totalVisits: 0,
      averageDuration: 0,
      overtimeVisits: 0
    });
  } catch (error) {
    console.error('Error fetching visit statistics:', error);
    res.status(500).json({ message: 'Failed to fetch visit statistics' });
  }
});

module.exports = router; 