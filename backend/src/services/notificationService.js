const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const NotificationPreferences = require('../models/NotificationPreferences');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');
const Task = require('../models/Task');
const User = require('../models/User');

class NotificationService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // userId -> WebSocket
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'auth') {
            // Authenticate user and store connection
            const user = await User.findById(data.userId);
            if (user) {
              this.clients.set(data.userId, ws);
              ws.userId = data.userId;
              ws.send(JSON.stringify({
                type: 'auth_success',
                message: 'Connected to notification service'
              }));
            }
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        if (ws.userId) {
          this.clients.delete(ws.userId);
        }
      });
    });

    // Heartbeat to keep connections alive
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  async handleMessage(userId, message) {
    const { type, data } = message;

    switch (type) {
      case 'notification_read':
        await this.handleNotificationRead(userId, data);
        break;
      case 'update_preferences':
        await this.handlePreferencesUpdate(userId, data);
        break;
      case 'create_group':
        await this.handleGroupCreate(userId, data);
        break;
      case 'update_group':
        await this.handleGroupUpdate(userId, data);
        break;
      default:
        throw new AppError('Invalid message type', 400);
    }
  }

  async handlePreferencesUpdate(userId, data) {
    const preferences = await NotificationPreferences.findOneAndUpdate(
      { userId },
      data,
      { new: true, upsert: true }
    );
    this.sendToUser(userId, {
      type: 'preferences_updated',
      data: preferences
    });
  }

  async handleGroupCreate(userId, data) {
    const preferences = await NotificationPreferences.findOne({ userId });
    preferences.groups.push(data);
    await preferences.save();
    this.sendToUser(userId, {
      type: 'group_created',
      data: data
    });
  }

  async handleGroupUpdate(userId, data) {
    const { groupName, updates } = data;
    const preferences = await NotificationPreferences.findOne({ userId });
    const groupIndex = preferences.groups.findIndex(g => g.name === groupName);
    if (groupIndex !== -1) {
      preferences.groups[groupIndex] = { ...preferences.groups[groupIndex], ...updates };
      await preferences.save();
      this.sendToUser(userId, {
        type: 'group_updated',
        data: preferences.groups[groupIndex]
      });
    }
  }

  async shouldDeliverNotification(userId, notification) {
    try {
      const preferences = await NotificationPreferences.findOne({ userId });
      if (!preferences) {
        return true; // Default to delivering if no preferences set
      }

      // Check if notifications are globally enabled
      if (!preferences.enabled) {
        return false;
      }

      // Check quiet hours
      const isQuietHours = preferences.isQuietHours();
      if (isQuietHours) {
        if (!preferences.quietHours.allowUrgent) {
          return false;
        }
        if (notification.priority !== 'urgent') {
          return false;
        }
      }

      // Check category preferences
      const categorySettings = preferences.categories[notification.category];
      if (!categorySettings?.enabled) {
        return false;
      }

      // Check priority threshold
      const priorityLevels = ['low', 'medium', 'high', 'urgent'];
      const categoryPriorityIndex = priorityLevels.indexOf(categorySettings.priority);
      const notificationPriorityIndex = priorityLevels.indexOf(notification.priority);
      
      if (notificationPriorityIndex < categoryPriorityIndex) {
        return false;
      }

      // Check group settings if applicable
      if (notification.group) {
        const groupSettings = preferences.getGroupPreferences(notification.group);
        if (!groupSettings.enabled) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true; // Default to delivering on error
    }
  }

  async getSoundSettings(userId, notification) {
    try {
      const preferences = await NotificationPreferences.findOne({ userId });
      if (!preferences || !preferences.pushNotifications.enabled) {
        return null;
      }

      // Get sound settings from group if available
      if (notification.group) {
        const groupSettings = preferences.getGroupPreferences(notification.group);
        return {
          type: groupSettings.sound,
          volume: preferences.pushNotifications.sound.volume
        };
      }

      // Default sound settings
      return preferences.pushNotifications.sound.enabled ? {
        type: 'default',
        volume: preferences.pushNotifications.sound.volume
      } : null;
    } catch (error) {
      console.error('Error getting sound settings:', error);
      return null;
    }
  }

  async sendNotification(userId, notification) {
    try {
      // Check if notification should be delivered based on preferences
      const shouldDeliver = await this.shouldDeliverNotification(userId, notification);
      if (!shouldDeliver) {
        return;
      }

      // Add sound settings if enabled
      const soundSettings = await this.getSoundSettings(userId, notification);
      if (soundSettings) {
        notification.sound = soundSettings;
      }

      // Save notification to database
      const savedNotification = await Notification.create({
        ...notification,
        userId
      });

      // Send through WebSocket if client is connected
      this.sendToUser(userId, {
        type: 'notification',
        data: savedNotification
      });

    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  async sendNotificationToUsers(userIds, notification) {
    const timestamp = new Date();
    const notificationData = {
      ...notification,
      timestamp,
      id: `${timestamp.getTime()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Send to each user respecting their preferences
    for (const userId of userIds) {
      await this.sendNotification(userId, notificationData);
    }
  }

  /**
   * Send task assignment notification
   */
  async sendTaskAssignment(task, assignedTo) {
    const assignee = await User.findById(assignedTo);
    if (!assignee) return;

    await this.sendNotificationToUsers([assignedTo], {
      type: 'task_assignment',
      title: 'New Task Assigned',
      message: `You have been assigned a new ${task.priority} priority task: ${task.title}`,
      taskId: task._id,
      priority: task.priority,
      category: task.category
    });
  }

  /**
   * Send task update notification
   */
  async sendTaskUpdate(task, updateType, updatedBy) {
    const stakeholders = new Set([
      task.assignedTo?.toString(),
      task.createdBy?.toString(),
      ...task.watchers?.map(w => w.toString()) || []
    ]);
    stakeholders.delete(updatedBy?.toString());

    if (stakeholders.size === 0) return;

    const updateMessages = {
      status_change: `Task "${task.title}" status changed to ${task.status}`,
      comment_added: `New comment added to task "${task.title}"`,
      deadline_updated: `Deadline updated for task "${task.title}"`,
      priority_change: `Priority changed to ${task.priority} for task "${task.title}"`
    };

    await this.sendNotificationToUsers([...stakeholders], {
      type: 'task_update',
      title: 'Task Updated',
      message: updateMessages[updateType] || `Task "${task.title}" was updated`,
      taskId: task._id,
      updateType,
      priority: task.priority
    });
  }

  /**
   * Send deadline reminder
   */
  async sendDeadlineReminder(task) {
    const now = new Date();
    const deadline = new Date(task.dueDate);
    const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);

    if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 0) {
      await this.sendNotificationToUsers([task.assignedTo], {
        type: 'deadline_reminder',
        title: 'Upcoming Deadline',
        message: `Task "${task.title}" is due in ${Math.round(hoursUntilDeadline)} hours`,
        taskId: task._id,
        priority: task.priority,
        dueDate: task.dueDate
      });
    }
  }

  /**
   * Send workload alert
   */
  async sendWorkloadAlert(userId, workloadScore) {
    if (workloadScore.weighted > 40) { // 40 hours threshold
      await this.sendNotificationToUsers([userId], {
        type: 'workload_alert',
        title: 'High Workload Alert',
        message: `Your current workload is high (${Math.round(workloadScore.weighted)} weighted hours)`,
        metrics: workloadScore.metrics
      });
    }
  }

  /**
   * Broadcast department announcement
   */
  async broadcastDepartment(department, announcement) {
    const departmentUsers = await User.find({ department, isActive: true });
    const userIds = departmentUsers.map(user => user._id);

    await this.sendNotificationToUsers(userIds, {
      type: 'department_announcement',
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority || 'medium',
      metadata: announcement.metadata
    });
  }

  /**
   * Send emergency alert
   */
  async sendEmergencyAlert(department, alert) {
    const departmentUsers = await User.find({
      department,
      roles: { $in: ['doctor', 'nurse'] },
      isActive: true
    });

    await this.sendNotificationToUsers(
      departmentUsers.map(user => user._id),
      {
        type: 'emergency_alert',
        title: '🚨 Emergency Alert',
        message: alert.message,
        priority: 'high',
        location: alert.location,
        patientId: alert.patientId,
        responseRequired: true
      }
    );
  }

  sendToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
}

module.exports = NotificationService; 