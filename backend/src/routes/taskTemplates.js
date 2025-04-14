const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const TaskTemplate = require('../models/TaskTemplate');
const { verifyToken, authorize } = require('../middleware/auth');

// Validation middleware
const validateTemplate = [
  body('name').trim().notEmpty().withMessage('Template name is required'),
  body('category').isIn(['patient_care', 'admin', 'lab', 'medication', 'consultation', 'other'])
    .withMessage('Invalid category'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('estimatedDuration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
  body('priority').isIn(['high', 'medium', 'low']).withMessage('Invalid priority level'),
  body('checklist').isArray().withMessage('Checklist must be an array'),
  body('checklist.*.text').trim().notEmpty().withMessage('Checklist item text is required'),
  body('checklist.*.required').isBoolean().withMessage('Required field must be boolean'),
  body('department').trim().notEmpty().withMessage('Department is required')
];

// Get all templates
router.get('/', verifyToken, async (req, res) => {
  try {
    const filters = { isActive: true };
    
    // Apply search filters
    if (req.query.category) {
      filters.category = req.query.category;
    }
    if (req.query.department) {
      filters.department = req.query.department;
    }
    if (req.query.search) {
      filters.$text = { $search: req.query.search };
    }

    const templates = await TaskTemplate.find(filters)
      .populate('createdBy', 'name')
      .sort({ name: 1 });

    res.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Error fetching templates' });
  }
});

// Create new template
router.post('/', 
  verifyToken, 
  authorize(['admin', 'doctor']), 
  validateTemplate,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const template = new TaskTemplate({
        ...req.body,
        createdBy: req.user.id
      });

      await template.save();
      res.status(201).json({ template });
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ message: 'Error creating template' });
    }
});

// Get template by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const template = await TaskTemplate.findById(req.params.id)
      .populate('createdBy', 'name');
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Error fetching template' });
  }
});

// Update template
router.patch('/:id',
  verifyToken,
  authorize(['admin', 'doctor']),
  validateTemplate,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const template = await TaskTemplate.findById(req.params.id);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      // Only creator or admin can update
      if (!req.user.roles.includes('admin') && template.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this template' });
      }

      Object.assign(template, req.body);
      template.lastModified = new Date();
      await template.save();

      res.json({ template });
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ message: 'Error updating template' });
    }
});

// Delete template (soft delete)
router.delete('/:id',
  verifyToken,
  authorize(['admin', 'doctor']),
  async (req, res) => {
    try {
      const template = await TaskTemplate.findById(req.params.id);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }

      // Only creator or admin can delete
      if (!req.user.roles.includes('admin') && template.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this template' });
      }

      template.isActive = false;
      await template.save();

      res.json({ message: 'Template deleted successfully' });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ message: 'Error deleting template' });
    }
});

// Clone template
router.post('/:id/clone',
  verifyToken,
  authorize(['admin', 'doctor']),
  async (req, res) => {
    try {
      const sourceTemplate = await TaskTemplate.findById(req.params.id);
      if (!sourceTemplate) {
        return res.status(404).json({ message: 'Template not found' });
      }

      const clonedTemplate = new TaskTemplate({
        name: `${sourceTemplate.name} (Copy)`,
        category: sourceTemplate.category,
        description: sourceTemplate.description,
        estimatedDuration: sourceTemplate.estimatedDuration,
        priority: sourceTemplate.priority,
        checklist: sourceTemplate.checklist,
        department: sourceTemplate.department,
        tags: sourceTemplate.tags,
        createdBy: req.user.id
      });

      await clonedTemplate.save();
      res.status(201).json({ template: clonedTemplate });
    } catch (error) {
      console.error('Error cloning template:', error);
      res.status(500).json({ message: 'Error cloning template' });
    }
});

module.exports = router; 