const winston = require('winston');
const { createHash } = require('crypto');
const config = require('../config');

class SecurityMonitoringService {
  constructor() {
    // Initialize security event logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/security.log' }),
        new winston.transports.File({ filename: 'logs/alerts.log', level: 'warn' })
      ]
    });

    // Initialize threat tracking
    this.suspiciousIPs = new Map(); // IP -> suspicious activity count
    this.blockedIPs = new Set();
    this.failedLogins = new Map(); // IP -> failed login attempts
    this.securityEvents = [];
    
    // Security thresholds
    this.thresholds = {
      maxFailedLogins: 5,
      maxSuspiciousActivities: 10,
      suspiciousActivityWindow: 3600000, // 1 hour in ms
      blockDuration: 86400000 // 24 hours in ms
    };
  }

  // Track failed login attempts
  trackFailedLogin(ip, username) {
    const attempts = this.failedLogins.get(ip) || [];
    const now = Date.now();
    
    // Remove old attempts
    const recentAttempts = attempts.filter(
      attempt => now - attempt.timestamp < this.thresholds.suspiciousActivityWindow
    );
    
    recentAttempts.push({
      timestamp: now,
      username: this.hashIdentifier(username)
    });
    
    this.failedLogins.set(ip, recentAttempts);
    
    // Check if threshold exceeded
    if (recentAttempts.length >= this.thresholds.maxFailedLogins) {
      this.blockIP(ip, 'Excessive failed login attempts');
    }
  }

  // Track suspicious activities
  trackSuspiciousActivity(ip, activity, severity = 'low') {
    const count = this.suspiciousIPs.get(ip) || 0;
    this.suspiciousIPs.set(ip, count + 1);
    
    this.logSecurityEvent({
      type: 'suspicious_activity',
      ip,
      activity,
      severity,
      timestamp: new Date()
    });
    
    // Check if threshold exceeded
    if (count + 1 >= this.thresholds.maxSuspiciousActivities) {
      this.blockIP(ip, 'Excessive suspicious activities');
    }
  }

  // Block an IP address
  blockIP(ip, reason) {
    if (!this.blockedIPs.has(ip)) {
      this.blockedIPs.add(ip);
      
      this.logSecurityEvent({
        type: 'ip_blocked',
        ip,
        reason,
        timestamp: new Date()
      });
      
      // Schedule unblock after duration
      setTimeout(() => {
        this.unblockIP(ip);
      }, this.thresholds.blockDuration);
    }
  }

  // Unblock an IP address
  unblockIP(ip) {
    if (this.blockedIPs.has(ip)) {
      this.blockedIPs.delete(ip);
      this.suspiciousIPs.delete(ip);
      this.failedLogins.delete(ip);
      
      this.logSecurityEvent({
        type: 'ip_unblocked',
        ip,
        timestamp: new Date()
      });
    }
  }

  // Check if an IP is blocked
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  // Log security events
  logSecurityEvent(event) {
    this.securityEvents.push(event);
    
    // Keep only recent events in memory
    const now = Date.now();
    this.securityEvents = this.securityEvents.filter(
      e => now - e.timestamp < this.thresholds.suspiciousActivityWindow
    );
    
    // Log the event
    const logLevel = event.severity === 'high' ? 'warn' : 'info';
    this.logger[logLevel]('Security event detected', event);
  }

  // Hash sensitive identifiers
  hashIdentifier(identifier) {
    return createHash('sha256')
      .update(identifier)
      .digest('hex');
  }

  // Get security metrics
  getSecurityMetrics() {
    return {
      blockedIPCount: this.blockedIPs.size,
      suspiciousIPCount: this.suspiciousIPs.size,
      recentSecurityEvents: this.securityEvents.length,
      failedLoginAttempts: Array.from(this.failedLogins.values())
        .reduce((total, attempts) => total + attempts.length, 0)
    };
  }

  // Clear old data periodically
  cleanup() {
    const now = Date.now();
    
    // Clear old failed login attempts
    for (const [ip, attempts] of this.failedLogins.entries()) {
      const recentAttempts = attempts.filter(
        attempt => now - attempt.timestamp < this.thresholds.suspiciousActivityWindow
      );
      if (recentAttempts.length === 0) {
        this.failedLogins.delete(ip);
      } else {
        this.failedLogins.set(ip, recentAttempts);
      }
    }
    
    // Clear old suspicious IP counts
    for (const [ip, timestamp] of this.suspiciousIPs.entries()) {
      if (now - timestamp > this.thresholds.suspiciousActivityWindow) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }
}

// Create singleton instance
const securityMonitoring = new SecurityMonitoringService();

// Run cleanup periodically
setInterval(() => {
  securityMonitoring.cleanup();
}, 3600000); // Every hour

module.exports = securityMonitoring; 