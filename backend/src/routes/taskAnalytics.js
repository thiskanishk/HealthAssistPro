const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const TaskAnalyticsService = require('../services/taskAnalytics');
const { verifyToken, authorize } = require('../middleware/auth');

// Validation middleware
const validateDateRange = [
  query('startDate').isISO8601().withMessage('Invalid start date'),
  query('endDate').isISO8601().withMessage('Invalid end date'),
  query('department').optional().trim().notEmpty().withMessage('Department cannot be empty')
];

// Get department metrics
router.get('/department',
  verifyToken,
  authorize(['admin', 'manager', 'doctor']),
  validateDateRange,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { startDate, endDate } = req.query;
      const department = req.query.department || req.user.department;

      // Check department access
      if (!req.user.roles.includes('admin') && department !== req.user.department) {
        return res.status(403).json({ message: 'Not authorized to view this department\'s metrics' });
      }

      const metrics = await TaskAnalyticsService.getDepartmentMetrics(
        department,
        startDate,
        endDate
      );

      res.json({ metrics });
    } catch (error) {
      console.error('Error fetching department metrics:', error);
      res.status(500).json({ message: 'Error fetching department metrics' });
    }
});

// Get user metrics
router.get('/user/:userId?',
  verifyToken,
  validateDateRange,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { startDate, endDate } = req.query;
      const userId = req.params.userId || req.user.id;

      // Check user access
      if (userId !== req.user.id && !req.user.roles.includes('admin') && !req.user.roles.includes('manager')) {
        return res.status(403).json({ message: 'Not authorized to view this user\'s metrics' });
      }

      const metrics = await TaskAnalyticsService.getUserMetrics(
        userId,
        startDate,
        endDate
      );

      res.json({ metrics });
    } catch (error) {
      console.error('Error fetching user metrics:', error);
      res.status(500).json({ message: 'Error fetching user metrics' });
    }
});

// Get department comparison
router.get('/department/compare',
  verifyToken,
  authorize(['admin']),
  [
    ...validateDateRange,
    query('departments').isArray().withMessage('Departments must be an array')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { startDate, endDate, departments } = req.query;

      const metricsPromises = departments.map(department =>
        TaskAnalyticsService.getDepartmentMetrics(department, startDate, endDate)
      );

      const departmentMetrics = await Promise.all(metricsPromises);

      const comparison = departments.reduce((acc, department, index) => {
        acc[department] = departmentMetrics[index];
        return acc;
      }, {});

      res.json({ comparison });
    } catch (error) {
      console.error('Error comparing department metrics:', error);
      res.status(500).json({ message: 'Error comparing department metrics' });
    }
});

// Get task completion trends
router.get('/trends',
  verifyToken,
  authorize(['admin', 'manager']),
  validateDateRange,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { startDate, endDate } = req.query;
      const department = req.query.department || req.user.department;

      // Check department access
      if (!req.user.roles.includes('admin') && department !== req.user.department) {
        return res.status(403).json({ message: 'Not authorized to view this department\'s trends' });
      }

      const metrics = await TaskAnalyticsService.getDepartmentMetrics(
        department,
        startDate,
        endDate
      );

      res.json({ trends: metrics.trends });
    } catch (error) {
      console.error('Error fetching task trends:', error);
      res.status(500).json({ message: 'Error fetching task trends' });
    }
});

module.exports = router; 