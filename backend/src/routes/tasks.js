const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const Task = require('../models/Task');
const { verifyToken, authorize } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/task-attachments/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Validation middleware
const validateTask = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('priority').isIn(['high', 'medium', 'low']).withMessage('Invalid priority level'),
  body('dueDate').isISO8601().withMessage('Invalid due date'),
  body('category').isIn(['patient_care', 'admin', 'lab', 'medication', 'consultation', 'other'])
    .withMessage('Invalid category'),
  body('urgencyLevel').isIn(['routine', 'urgent', 'emergency']).withMessage('Invalid urgency level'),
  body('estimatedDuration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
  body('department').trim().notEmpty().withMessage('Department is required')
];

// Get tasks with filtering and pagination
router.get('/', verifyToken, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['todo', 'in_progress', 'completed']),
  query('category').optional(),
  query('urgencyLevel').optional(),
  query('patientId').optional(),
  query('assignedTo').optional(),
  query('department').optional(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.category) filters.category = req.query.category;
    if (req.query.urgencyLevel) filters.urgencyLevel = req.query.urgencyLevel;
    if (req.query.patientId) filters.patientId = req.query.patientId;
    if (req.query.assignedTo) filters.assignedTo = req.query.assignedTo;
    if (req.query.department) filters.department = req.query.department;

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filters.dueDate = {};
      if (req.query.startDate) filters.dueDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filters.dueDate.$lte = new Date(req.query.endDate);
    }

    // Search filter
    if (req.query.search) {
      filters.$text = { $search: req.query.search };
    }

    // Access control based on user role
    if (!req.user.roles.includes('admin')) {
      filters.$or = [
        { assignedTo: req.user.id },
        { createdBy: req.user.id },
        { department: req.user.department }
      ];
    }

    const [tasks, total] = await Promise.all([
      Task.find(filters)
        .populate('assignedTo', 'name')
        .populate('patientId', 'name roomNumber')
        .populate('createdBy', 'name')
        .sort({ dueDate: 1, urgencyLevel: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filters)
    ]);

    res.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// Create new task
router.post('/',
  verifyToken,
  validateTask,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const task = new Task({
        ...req.body,
        createdBy: req.user.id,
        status: 'todo'
      });

      await task.save();
      
      // Populate references for response
      await task.populate([
        { path: 'assignedTo', select: 'name' },
        { path: 'patientId', select: 'name roomNumber' }
      ]);

      res.status(201).json({ task });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Error creating task' });
    }
});

// Get task by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name')
      .populate('patientId', 'name roomNumber')
      .populate('createdBy', 'name')
      .populate('dependencies', 'title status');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check access permission
    if (!req.user.roles.includes('admin') &&
        task.createdBy.id !== req.user.id &&
        task.assignedTo?.id !== req.user.id &&
        task.department !== req.user.department) {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }

    res.json({ task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Error fetching task' });
  }
});

// Update task
router.patch('/:id',
  verifyToken,
  validateTask,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // Check update permission
      if (!req.user.roles.includes('admin') &&
          task.createdBy.toString() !== req.user.id &&
          task.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }

      // Track changes for history
      const changes = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (task[key] !== value) {
          changes[key] = {
            from: task[key],
            to: value
          };
        }
      }

      // Add history entry if there are changes
      if (Object.keys(changes).length > 0) {
        task.addHistoryEntry('updated', req.user.id, changes);
      }

      // Special handling for status changes
      if (req.body.status && req.body.status !== task.status) {
        task.addHistoryEntry('status_changed', req.user.id, {
          from: task.status,
          to: req.body.status
        });
      }

      Object.assign(task, req.body);
      await task.save();

      // Populate references for response
      await task.populate([
        { path: 'assignedTo', select: 'name' },
        { path: 'patientId', select: 'name roomNumber' }
      ]);

      res.json({ task });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Error updating task' });
    }
});

// Delete task
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only creator, assigned user, or admin can delete
    if (!req.user.roles.includes('admin') &&
        task.createdBy.toString() !== req.user.id &&
        task.assignedTo?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await task.remove();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Error deleting task' });
  }
});

// Upload attachments
router.post('/:id/attachments',
  verifyToken,
  upload.array('files', 5),
  async (req, res) => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // Check permission
      if (!req.user.roles.includes('admin') &&
          task.createdBy.toString() !== req.user.id &&
          task.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to add attachments' });
      }

      const attachments = req.files.map(file => ({
        name: file.originalname,
        type: file.mimetype,
        url: `/uploads/task-attachments/${file.filename}`
      }));

      task.attachments.push(...attachments);
      task.addHistoryEntry('updated', req.user.id, {
        action: 'attachments_added',
        files: attachments.map(a => a.name)
      });

      await task.save();
      res.json({ attachments });
    } catch (error) {
      console.error('Error uploading attachments:', error);
      res.status(500).json({ message: 'Error uploading attachments' });
    }
});

// Update checklist item
router.patch('/:id/checklist/:itemId',
  verifyToken,
  [body('completed').isBoolean()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // Check permission
      if (!req.user.roles.includes('admin') &&
          task.createdBy.toString() !== req.user.id &&
          task.assignedTo?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update checklist' });
      }

      const checklistItem = task.checklist.id(req.params.itemId);
      if (!checklistItem) {
        return res.status(404).json({ message: 'Checklist item not found' });
      }

      checklistItem.completed = req.body.completed;
      if (req.body.completed) {
        checklistItem.completedAt = new Date();
        checklistItem.completedBy = req.user.id;
      } else {
        checklistItem.completedAt = null;
        checklistItem.completedBy = null;
      }

      task.addHistoryEntry('updated', req.user.id, {
        action: 'checklist_item_updated',
        item: checklistItem.text,
        completed: req.body.completed
      });

      await task.save();
      res.json({ task });
    } catch (error) {
      console.error('Error updating checklist item:', error);
      res.status(500).json({ message: 'Error updating checklist item' });
    }
});

module.exports = router; 