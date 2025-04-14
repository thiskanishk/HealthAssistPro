const securityMonitoring = require('./securityMonitoring');
const { User } = require('../models/User');
const winston = require('winston');

class SecurityDashboardService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/security-dashboard.log' })
      ]
    });
  }

  // Get overall security metrics
  async getSecurityOverview() {
    try {
      const metrics = securityMonitoring.getSecurityMetrics();
      const userMetrics = await this.getUserSecurityMetrics();
      const recentEvents = await this.getRecentSecurityEvents();
      const vulnerabilities = await this.getVulnerabilityReport();

      return {
        metrics,
        userMetrics,
        recentEvents,
        vulnerabilities,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Error getting security overview:', error);
      throw error;
    }
  }

  // Get user security metrics
  async getUserSecurityMetrics() {
    const users = await User.find({});
    
    return {
      total: users.length,
      twoFactorEnabled: users.filter(u => u.twoFactorEnabled).length,
      recentlyActive: users.filter(u => {
        const lastActivity = new Date(u.lastActivity);
        return Date.now() - lastActivity < 7 * 24 * 60 * 60 * 1000; // 7 days
      }).length,
      passwordResetRequired: users.filter(u => u.requirePasswordReset).length,
      lockedAccounts: users.filter(u => u.isLocked).length
    };
  }

  // Get recent security events
  async getRecentSecurityEvents(limit = 100) {
    return securityMonitoring.securityEvents
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Generate vulnerability report
  async getVulnerabilityReport() {
    const vulnerabilities = [];
    const users = await User.find({});

    // Check for users without 2FA
    const unsecuredUsers = users.filter(u => !u.twoFactorEnabled);
    if (unsecuredUsers.length > 0) {
      vulnerabilities.push({
        severity: 'high',
        type: 'missing_2fa',
        count: unsecuredUsers.length,
        description: 'Users without Two-Factor Authentication enabled'
      });
    }

    // Check for inactive users
    const inactiveUsers = users.filter(u => {
      const lastActivity = new Date(u.lastActivity);
      return Date.now() - lastActivity > 30 * 24 * 60 * 60 * 1000; // 30 days
    });
    if (inactiveUsers.length > 0) {
      vulnerabilities.push({
        severity: 'medium',
        type: 'inactive_users',
        count: inactiveUsers.length,
        description: 'Users inactive for more than 30 days'
      });
    }

    // Add system vulnerabilities
    const systemVulns = this.checkSystemVulnerabilities();
    vulnerabilities.push(...systemVulns);

    return vulnerabilities;
  }

  // Check system vulnerabilities
  checkSystemVulnerabilities() {
    const vulnerabilities = [];

    // Check session configuration
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      vulnerabilities.push({
        severity: 'critical',
        type: 'weak_session_secret',
        description: 'Session secret is missing or too weak'
      });
    }

    // Check encryption configuration
    if (!process.env.ENCRYPTION_KEY) {
      vulnerabilities.push({
        severity: 'critical',
        type: 'missing_encryption_key',
        description: 'Encryption key is not configured'
      });
    }

    // Check rate limiting
    const rateLimitConfig = securityMonitoring.thresholds;
    if (rateLimitConfig.maxFailedLogins > 10) {
      vulnerabilities.push({
        severity: 'medium',
        type: 'high_failed_login_threshold',
        description: 'Failed login attempt threshold is too high'
      });
    }

    return vulnerabilities;
  }

  // Generate security report
  async generateSecurityReport(startDate, endDate) {
    try {
      const events = await this.getSecurityEvents(startDate, endDate);
      const metrics = await this.calculateSecurityMetrics(events);
      const recommendations = this.generateRecommendations(metrics);

      return {
        period: { startDate, endDate },
        events: {
          total: events.length,
          byType: this.groupEventsByType(events),
          bySeverity: this.groupEventsBySeverity(events)
        },
        metrics,
        recommendations,
        generatedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Error generating security report:', error);
      throw error;
    }
  }

  // Helper methods for report generation
  groupEventsByType(events) {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
  }

  groupEventsBySeverity(events) {
    return events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {});
  }

  generateRecommendations(metrics) {
    const recommendations = [];

    if (metrics.failedLoginRate > 0.1) {
      recommendations.push({
        priority: 'high',
        description: 'High rate of failed login attempts detected',
        action: 'Review and strengthen password policies'
      });
    }

    if (metrics.suspicious2FARate > 0.05) {
      recommendations.push({
        priority: 'critical',
        description: 'Suspicious 2FA verification attempts detected',
        action: 'Investigate potential account compromise attempts'
      });
    }

    return recommendations;
  }
}

module.exports = new SecurityDashboardService(); 