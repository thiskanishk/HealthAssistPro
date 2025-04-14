const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const winston = require('winston');
const config = require('../config');
const securityConfig = require('../config/security');

// Configure Winston logger for audit logs
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/audit.log' }),
    new winston.transports.File({ filename: 'logs/security.log', level: 'warn' })
  ]
});

// Advanced rate limiting with IP tracking
const rateLimiter = rateLimit(securityConfig.rateLimit);

// Brute force protection
const ExpressBrute = require('express-brute');
const MongoStore = require('express-brute-mongo');
const store = new MongoStore(() => mongoose.connection.db);
const bruteforce = new ExpressBrute(store, securityConfig.bruteForce);

// Session configuration
const sessionConfig = {
  ...securityConfig.session,
  store: MongoStore.create({
    mongoUrl: config.database.url,
    crypto: {
      secret: process.env.SESSION_ENCRYPT_SECRET
    }
  })
};

// Request size limits
const requestSizeLimiter = express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
});

// Security headers
const securityHeaders = helmet(securityConfig.helmet);

// Audit logging middleware with enhanced tracking
const auditLog = (req, res, next) => {
  const logData = {
    timestamp: new Date(),
    userId: req.user ? req.user.id : 'anonymous',
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    origin: req.get('origin'),
    referrer: req.get('referrer'),
    requestId: req.id, // Added by Express
    sessionId: req.sessionID
  };

  // Log sensitive operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    auditLogger.info('Sensitive operation performed', logData);
  }

  // Log access to sensitive data
  if (req.path.includes('/patients/')) {
    auditLogger.info('Patient data accessed', logData);
  }

  // Log security events
  if (req.securityViolation) {
    auditLogger.warn('Security violation detected', {
      ...logData,
      violation: req.securityViolation
    });
  }

  next();
};

// Request sanitization middleware
const sanitizeRequest = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    });
  }

  // Sanitize request query
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key]);
      }
    });
  }

  next();
};

// Session security middleware
const sessionSecurity = (req, res, next) => {
  if (req.session && req.session.user) {
    // Regenerate session ID periodically
    if (Date.now() - req.session.created > securityConfig.session.cookie.maxAge / 2) {
      req.session.regenerate((err) => {
        if (err) {
          auditLogger.error('Session regeneration failed', { error: err });
        }
        next();
      });
    } else {
      next();
    }
  } else {
    next();
  }
};

// IP blocking middleware
const ipBlocker = (req, res, next) => {
  const clientIp = req.ip;
  
  // Check if IP is in blocklist
  if (global.blockedIPs && global.blockedIPs.has(clientIp)) {
    auditLogger.warn('Blocked IP attempted access', { ip: clientIp });
    return res.status(403).json({
      status: 'error',
      message: 'Access denied'
    });
  }

  next();
};

// Apply all security middleware
const securityMiddleware = [
  securityHeaders,
  rateLimiter,
  requestSizeLimiter,
  express.session(sessionConfig),
  sessionSecurity,
  mongoSanitize(),
  xss(),
  hpp(),
  ipBlocker,
  sanitizeRequest,
  auditLog
];

module.exports = {
  securityMiddleware,
  rateLimiter,
  bruteforce,
  auditLog,
  ipBlocker,
  sanitizeRequest
}; 