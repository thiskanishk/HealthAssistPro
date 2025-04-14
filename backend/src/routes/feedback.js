const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');
const { verifyToken, authorize, logActivity } = require('../middleware/auth');

// Validation middleware
const validateFeedback = [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString().trim().isLength({ max: 1000 }),
  body('accuracy.wasCorrect').optional().isBoolean(),
  body('accuracy.actualCondition').optional().isString(),
  body('accuracy.actualICD10').optional().isString(),
  body('usefulnessScore').optional().isInt({ min: 1, max: 5 }),
  body('treatmentEffectiveness').optional().isIn([
    'very_effective', 'somewhat_effective', 'not_effective', 'not_implemented', 'unknown'
  ]),
  body('suggestedImprovements').optional().isArray(),
  body('metadata').optional().isObject()
];

// Submit feedback for a diagnosis
router.post(
  '/:diagnosisId',
  verifyToken,
  authorize('doctor', 'nurse'),
  validateFeedback,
  logActivity('feedback_submit'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const feedback = new Feedback({
        diagnosis: req.params.diagnosisId,
        user: req.user._id,
        ...req.body
      });

      await feedback.save();

      res.status(201).json({
        status: 'success',
        data: feedback
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get feedback statistics
router.get(
  '/stats',
  verifyToken,
  authorize('admin', 'doctor'),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

      const stats = await Feedback.getStatistics(startDate, endDate);

      if (stats.length === 0) {
        return res.json({
          status: 'success',
          data: {
            averageRating: 0,
            totalFeedback: 0,
            ratingDistribution: [],
            accuracyRate: 0,
            averageResponseTime: 0
          }
        });
      }

      res.json({
        status: 'success',
        data: stats[0]
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get feedback for a specific diagnosis
router.get(
  '/diagnosis/:diagnosisId',
  verifyToken,
  authorize('doctor', 'nurse', 'admin'),
  async (req, res) => {
    try {
      const feedback = await Feedback.findOne({ diagnosis: req.params.diagnosisId })
        .populate('user', 'firstName lastName role');

      if (!feedback) {
        return res.status(404).json({
          status: 'error',
          message: 'Feedback not found'
        });
      }

      res.json({
        status: 'success',
        data: feedback
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get user's feedback history
router.get(
  '/my-feedback',
  verifyToken,
  authorize('doctor', 'nurse'),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [feedback, total] = await Promise.all([
        Feedback.find({ user: req.user._id })
          .populate('diagnosis', 'createdAt conditions')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Feedback.countDocuments({ user: req.user._id })
      ]);

      res.json({
        status: 'success',
        data: {
          feedback,
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

// Update feedback
router.patch(
  '/:id',
  verifyToken,
  authorize('doctor', 'nurse'),
  validateFeedback,
  logActivity('feedback_update'),
  async (req, res) => {
    try {
      const feedback = await Feedback.findOne({
        _id: req.params.id,
        user: req.user._id
      });

      if (!feedback) {
        return res.status(404).json({
          status: 'error',
          message: 'Feedback not found or unauthorized'
        });
      }

      // Update allowed fields
      const updateFields = [
        'rating', 'comment', 'accuracy', 'usefulnessScore',
        'treatmentEffectiveness', 'suggestedImprovements'
      ];

      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          feedback[field] = req.body[field];
        }
      });

      await feedback.save();

      res.json({
        status: 'success',
        data: feedback
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