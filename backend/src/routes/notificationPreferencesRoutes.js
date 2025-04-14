const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getPreferences,
  updatePreferences,
  updateQuietHours,
  updateCategoryPreferences,
  createGroup,
  updateGroup,
  deleteGroup
} = require('../controllers/notificationPreferencesController');

// All routes require authentication
router.use(authenticate);

// Get and update preferences
router.get('/', getPreferences);
router.patch('/', updatePreferences);

// Quiet hours management
router.patch('/quiet-hours', updateQuietHours);

// Category preferences
router.patch('/categories', updateCategoryPreferences);

// Group management
router.post('/groups', createGroup);
router.patch('/groups', updateGroup);
router.delete('/groups/:groupName', deleteGroup);

module.exports = router; 