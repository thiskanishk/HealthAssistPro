const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Feedback = require('../models/Feedback');
const { verifyToken, authorize, logActivity } = require('../middleware/auth');

// Validation middleware
const validateDateRange = [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
];

const validateUserUpdate = [
  body('status').optional().isIn(['active', 'inactive', 'suspended']),
  body('role').optional().isIn(['doctor', 'nurse', 'admin']),
  body('specialization').optional().isString(),
  body('permissions').optional().isArray()
];

// Get all users with filtering and pagination
router.get(
  '/users',
  verifyToken,
  authorize('admin'),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};
      if (req.query.role) filter.role = req.query.role;
      if (req.query.status) filter.status = req.query.status;
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        filter.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex }
        ];
      }

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        User.countDocuments(filter)
      ]);

      res.json({
        status: 'success',
        data: {
          users,
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

// Update user status or role
router.patch(
  '/users/:id',
  verifyToken,
  authorize('admin'),
  validateUserUpdate,
  logActivity('user_update'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          errors: errors.array()
        });
      }

      const user = await User.findById(req.params.id).select('-password');
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Update allowed fields
      const updateFields = ['status', 'role', 'specialization', 'permissions'];
      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          user[field] = req.body[field];
        }
      });

      await user.save();

      res.json({
        status: 'success',
        data: user
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
);

// Get audit logs with filtering
router.get(
  '/audit-logs',
  verifyToken,
  authorize('admin'),
  validateDateRange,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};
      if (req.query.action) filter.action = req.query.action;
      if (req.query.resourceType) filter.resourceType = req.query.resourceType;
      if (req.query.userId) filter.user = req.query.userId;
      if (req.query.status) filter.status = req.query.status;
      if (req.query.startDate || req.query.endDate) {
        filter.createdAt = {};
        if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
        if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
      }

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .populate('user', 'firstName lastName email role')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        AuditLog.countDocuments(filter)
      ]);

      res.json({
        status: 'success',
        data: {
          logs,
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

// Get system statistics
router.get(
  '/statistics',
  verifyToken,
  authorize('admin'),
  validateDateRange,
  async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

      const [
        userStats,
        activityStats,
        feedbackStats
      ] = await Promise.all([
        // User statistics
        User.aggregate([
          {
            $group: {
              _id: '$role',
              count: { $sum: 1 },
              active: {
                $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
              }
            }
          }
        ]),
        // Activity statistics
        AuditLog.getActivityStats(startDate, endDate),
        // Feedback statistics
        Feedback.getStatistics(startDate, endDate)
      ]);

      res.json({
        status: 'success',
        data: {
          users: userStats,
          activity: activityStats,
          feedback: feedbackStats[0] || {
            averageRating: 0,
            totalFeedback: 0,
            accuracyRate: 0
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

// Get user activity summary
router.get(
  '/users/:id/activity',
  verifyToken,
  authorize('admin'),
  validateDateRange,
  async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

      const activitySummary = await AuditLog.getUserActivitySummary(
        req.params.id,
        startDate,
        endDate
      );

      res.json({
        status: 'success',
        data: activitySummary
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