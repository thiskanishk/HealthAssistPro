const express = require('express');
const { verifyToken, authorize } = require('../middleware/auth');
const SecurityEvent = require('../models/SecurityEvent');
const User = require('../models/User');
const Device = require('../models/Device');
const { getGeoLocation } = require('../services/geoLocation');
const { calculateSecurityScore } = require('../services/securityMetrics');
const router = express.Router();

// Get security metrics
router.get('/metrics', [verifyToken, authorize(['admin'])], async (req, res) => {
  try {
    // Get active users (logged in within last 24 hours)
    const activeUsers = await User.countDocuments({
      lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Get failed login attempts in last 24 hours
    const failedLogins = await SecurityEvent.countDocuments({
      type: 'error',
      category: 'auth',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Get blocked IPs
    const blockedIPs = await SecurityEvent.distinct('ipAddress', {
      type: 'error',
      category: 'auth',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      'metadata.blocked': true
    }).length;

    // Get active devices
    const activeDevices = await Device.countDocuments({
      lastUsedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    // Get 2FA enabled count
    const twoFactorEnabled = await User.countDocuments({ is2FAEnabled: true });

    // Get vulnerability counts
    const vulnerabilities = {
      high: await SecurityEvent.countDocuments({ type: 'error', category: 'system' }),
      medium: await SecurityEvent.countDocuments({ type: 'warning', category: 'system' }),
      low: await SecurityEvent.countDocuments({ type: 'info', category: 'system' })
    };

    // Get threat locations
    const threatEvents = await SecurityEvent.find({
      type: 'error',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).select('ipAddress');

    const threatLocations = await Promise.all(
      threatEvents.map(async (event) => {
        const location = await getGeoLocation(event.ipAddress);
        return {
          country: location.country,
          count: 1,
          lat: location.latitude,
          lng: location.longitude
        };
      })
    );

    // Aggregate threat locations
    const aggregatedLocations = threatLocations.reduce((acc, location) => {
      const existing = acc.find(l => l.country === location.country);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push(location);
      }
      return acc;
    }, []);

    // Calculate security score
    const securityScore = calculateSecurityScore({
      twoFactorAdoption: (twoFactorEnabled / activeUsers) * 100,
      vulnerabilities,
      failedLogins,
      blockedIPs
    });

    res.json({
      activeUsers,
      failedLogins,
      blockedIPs,
      activeDevices,
      twoFactorEnabled,
      vulnerabilities,
      threatLocations: aggregatedLocations,
      securityScore
    });
  } catch (error) {
    console.error('Error fetching security metrics:', error);
    res.status(500).json({ message: 'Failed to fetch security metrics' });
  }
});

// Get security events with filtering
router.get('/events', [verifyToken, authorize(['admin'])], async (req, res) => {
  try {
    const { type, category, startDate, endDate, limit = 50 } = req.query;
    const query = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const events = await SecurityEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'email');

    res.json({ events });
  } catch (error) {
    console.error('Error fetching security events:', error);
    res.status(500).json({ message: 'Failed to fetch security events' });
  }
});

// Create security event
router.post('/events', verifyToken, async (req, res) => {
  try {
    const { type, category, message, details, ipAddress, userId } = req.body;

    const event = new SecurityEvent({
      type,
      category,
      message,
      details,
      ipAddress,
      userId,
      metadata: {
        userAgent: req.headers['user-agent'],
        blocked: type === 'error' && category === 'auth'
      }
    });

    await event.save();
    res.status(201).json({ event });
  } catch (error) {
    console.error('Error creating security event:', error);
    res.status(500).json({ message: 'Failed to create security event' });
  }
});

module.exports = router; 