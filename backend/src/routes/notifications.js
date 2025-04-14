const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const Notification = require('../models/Notification');

// Get all notifications for a user
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort({ timestamp: -1 })
    .limit(50);
  res.json(notifications);
}));

// Mark notification as read
router.patch('/:id/read', verifyToken, asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { read: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  // Notify through WebSocket
  req.app.get('websocketService').sendToUser(req.user.id, {
    type: 'notification_read',
    data: { id: notification._id }
  });

  res.json(notification);
}));

// Mark all notifications as read
router.patch('/read-all', verifyToken, asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.id, read: false },
    { read: true }
  );

  // Notify through WebSocket
  req.app.get('websocketService').sendToUser(req.user.id, {
    type: 'all_notifications_read'
  });

  res.json({ message: 'All notifications marked as read' });
}));

// Delete a notification
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  // Notify through WebSocket
  req.app.get('websocketService').sendToUser(req.user.id, {
    type: 'notification_deleted',
    data: { id: notification._id }
  });

  res.json({ message: 'Notification deleted' });
}));

// Create a notification (internal use only)
const createNotification = async (userId, type, title, message, metadata = {}) => {
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    metadata,
    timestamp: new Date(),
    read: false
  });

  // Send notification through WebSocket
  req.app.get('websocketService').sendToUser(userId, {
    type: 'notification',
    data: notification
  });

  return notification;
};

module.exports = {
  router,
  createNotification
}; 