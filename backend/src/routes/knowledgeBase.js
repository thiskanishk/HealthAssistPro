const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const KnowledgeBase = require('../models/KnowledgeBase');
const { verifyToken, authorize, logActivity } = require('../middleware/auth');

// Validation middleware
const validateSearch = [
  query('q').optional().isString().trim(),
  query('specialty').optional().isIn(['Cardiology', 'Neurology', 'Pediatrics', 'Gynecology', 
    'Orthopedics', 'Dermatology', 'Psychiatry', 'Oncology', 'General']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
];

// Search knowledge base
router.get(
  '/search',
  verifyToken,
  authorize('doctor', 'nurse'),
  validateSearch,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Build search query
      const searchQuery = {};
      if (req.query.q) {
        searchQuery.$text = { $search: req.query.q };
      }
      if (req.query.specialty) {
        searchQuery.specialty = req.query.specialty;
      }

      // Execute search with pagination
      const [results, total] = await Promise.all([
        KnowledgeBase.find(searchQuery)
          .select('-references -metadata')
          .skip(skip)
          .limit(limit)
          .sort({ score: { $meta: 'textScore' } }),
        KnowledgeBase.countDocuments(searchQuery)
      ]);

      res.json({
        status: 'success',
        data: {
          results,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get condition by ICD-10 code
router.get(
  '/icd10/:code',
  verifyToken,
  authorize('doctor', 'nurse'),
  [param('code').isString().trim()],
  async (req, res) => {
    try {
      const condition = await KnowledgeBase.findOne({ icd10Code: req.params.code });
      
      if (!condition) {
        return res.status(404).json({
          status: 'error',
          message: 'Condition not found'
        });
      }

      // Get related conditions
      const relatedConditions = await condition.getRelatedConditions();

      res.json({
        status: 'success',
        data: {
          condition,
          relatedConditions
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get conditions by specialty
router.get(
  '/specialty/:type',
  verifyToken,
  authorize('doctor', 'nurse'),
  [
    param('type').isIn(['Cardiology', 'Neurology', 'Pediatrics', 'Gynecology', 
      'Orthopedics', 'Dermatology', 'Psychiatry', 'Oncology', 'General'])
  ],
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [conditions, total] = await Promise.all([
        KnowledgeBase.find({ specialty: req.params.type })
          .select('name icd10Code description symptoms.name')
          .skip(skip)
          .limit(limit)
          .sort({ name: 1 }),
        KnowledgeBase.countDocuments({ specialty: req.params.type })
      ]);

      res.json({
        status: 'success',
        data: {
          conditions,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get common symptoms for a specialty
router.get(
  '/specialty/:type/symptoms',
  verifyToken,
  authorize('doctor', 'nurse'),
  [
    param('type').isIn(['Cardiology', 'Neurology', 'Pediatrics', 'Gynecology', 
      'Orthopedics', 'Dermatology', 'Psychiatry', 'Oncology', 'General'])
  ],
  async (req, res) => {
    try {
      const conditions = await KnowledgeBase.find({ 
        specialty: req.params.type,
        'symptoms.commonality': 'very_common'
      }).select('symptoms');

      // Aggregate and count common symptoms
      const symptomMap = new Map();
      conditions.forEach(condition => {
        condition.symptoms.forEach(symptom => {
          if (symptom.commonality === 'very_common') {
            const count = symptomMap.get(symptom.name) || 0;
            symptomMap.set(symptom.name, count + 1);
          }
        });
      });

      // Convert to array and sort by frequency
      const symptoms = Array.from(symptomMap.entries())
        .map(([name, frequency]) => ({ name, frequency }))
        .sort((a, b) => b.frequency - a.frequency);

      res.json({
        status: 'success',
        data: symptoms
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

module.exports = router; 