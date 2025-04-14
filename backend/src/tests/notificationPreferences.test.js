const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../app');
const NotificationPreferences = require('../models/NotificationPreferences');
const NotificationService = require('../services/notificationService');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

let mongoServer;
let testUser;
let authToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create test user
  testUser = await User.create({
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'doctor'
  });

  authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await NotificationPreferences.deleteMany({});
});

describe('Notification Preferences API', () => {
  describe('GET /api/notification-preferences', () => {
    it('should return default preferences for new user', async () => {
      const response = await request(app)
        .get('/api/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('enabled', true);
      expect(response.body.emailNotifications).toHaveProperty('enabled', true);
      expect(response.body.pushNotifications).toHaveProperty('enabled', true);
    });

    it('should return existing preferences', async () => {
      const prefs = await NotificationPreferences.create({
        userId: testUser._id,
        enabled: false,
        emailNotifications: { enabled: false, frequency: 'daily' }
      });

      const response = await request(app)
        .get('/api/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(false);
      expect(response.body.emailNotifications.enabled).toBe(false);
      expect(response.body.emailNotifications.frequency).toBe('daily');
    });
  });

  describe('PATCH /api/notification-preferences', () => {
    it('should update global preferences', async () => {
      const response = await request(app)
        .patch('/api/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(false);
    });

    it('should update email notification preferences', async () => {
      const response = await request(app)
        .patch('/api/notification-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailNotifications: {
            enabled: true,
            frequency: 'weekly'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.emailNotifications.enabled).toBe(true);
      expect(response.body.emailNotifications.frequency).toBe('weekly');
    });
  });

  describe('PATCH /api/notification-preferences/quiet-hours', () => {
    it('should update quiet hours settings', async () => {
      const response = await request(app)
        .patch('/api/notification-preferences/quiet-hours')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true,
          start: '22:00',
          end: '07:00',
          allowUrgent: true
        });

      expect(response.status).toBe(200);
      expect(response.body.quietHours.enabled).toBe(true);
      expect(response.body.quietHours.start).toBe('22:00');
      expect(response.body.quietHours.end).toBe('07:00');
      expect(response.body.quietHours.allowUrgent).toBe(true);
    });
  });

  describe('PATCH /api/notification-preferences/categories', () => {
    it('should update category preferences', async () => {
      const response = await request(app)
        .patch('/api/notification-preferences/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'tasks',
          enabled: true,
          priority: 'high'
        });

      expect(response.status).toBe(200);
      expect(response.body.categories.tasks.enabled).toBe(true);
      expect(response.body.categories.tasks.priority).toBe('high');
    });

    it('should reject invalid category', async () => {
      const response = await request(app)
        .patch('/api/notification-preferences/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'invalid_category',
          enabled: true,
          priority: 'high'
        });

      expect(response.status).toBe(400);
    });
  });
});

describe('NotificationService Preferences Integration', () => {
  let notificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  describe('shouldDeliverNotification', () => {
    it('should respect global notification toggle', async () => {
      await NotificationPreferences.create({
        userId: testUser._id,
        enabled: false
      });

      const shouldDeliver = await notificationService.shouldDeliverNotification(
        testUser._id,
        {
          type: 'task_update',
          priority: 'high',
          category: 'tasks'
        }
      );

      expect(shouldDeliver).toBe(false);
    });

    it('should respect quiet hours', async () => {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMinute = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;

      await NotificationPreferences.create({
        userId: testUser._id,
        quietHours: {
          enabled: true,
          start: '00:00',
          end: '23:59',
          allowUrgent: true
        }
      });

      const regularNotification = await notificationService.shouldDeliverNotification(
        testUser._id,
        {
          type: 'task_update',
          priority: 'medium',
          category: 'tasks'
        }
      );

      const urgentNotification = await notificationService.shouldDeliverNotification(
        testUser._id,
        {
          type: 'emergency_alert',
          priority: 'urgent',
          category: 'alerts'
        }
      );

      expect(regularNotification).toBe(false);
      expect(urgentNotification).toBe(true);
    });

    it('should respect category priority thresholds', async () => {
      await NotificationPreferences.create({
        userId: testUser._id,
        categories: {
          tasks: {
            enabled: true,
            priority: 'high'
          }
        }
      });

      const lowPriorityNotification = await notificationService.shouldDeliverNotification(
        testUser._id,
        {
          type: 'task_update',
          priority: 'medium',
          category: 'tasks'
        }
      );

      const highPriorityNotification = await notificationService.shouldDeliverNotification(
        testUser._id,
        {
          type: 'task_update',
          priority: 'urgent',
          category: 'tasks'
        }
      );

      expect(lowPriorityNotification).toBe(false);
      expect(highPriorityNotification).toBe(true);
    });
  });

  describe('getSoundSettings', () => {
    it('should return null when push notifications are disabled', async () => {
      await NotificationPreferences.create({
        userId: testUser._id,
        pushNotifications: {
          enabled: false,
          sound: { enabled: true, volume: 0.7 }
        }
      });

      const soundSettings = await notificationService.getSoundSettings(
        testUser._id,
        { type: 'task_update' }
      );

      expect(soundSettings).toBeNull();
    });

    it('should return group sound settings when available', async () => {
      await NotificationPreferences.create({
        userId: testUser._id,
        pushNotifications: {
          enabled: true,
          sound: { enabled: true, volume: 0.7 }
        },
        groups: [{
          name: 'important',
          enabled: true,
          priority: 'high',
          sound: 'alert'
        }]
      });

      const soundSettings = await notificationService.getSoundSettings(
        testUser._id,
        {
          type: 'task_update',
          group: 'important'
        }
      );

      expect(soundSettings).toEqual({
        type: 'alert',
        volume: 0.7
      });
    });
  });
}); 