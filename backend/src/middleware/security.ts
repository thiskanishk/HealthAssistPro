import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { config } from '../config';
import winston from 'winston';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { rateLimiters } from './rateLimit';

// Types for security configuration
interface SecurityConfig {
  cors: {
    origin: string | string[];
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };
  cookie: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
  csp: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    fontSrc: string[];
    connectSrc: string[];
  };
  session: {
    secret: string;
    resave: boolean;
    saveUninitialized: boolean;
    cookie: {
      secure: boolean;
      httpOnly: boolean;
      maxAge: number;
    };
  };
}

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

// Security configuration based on environment
const securityConfig: SecurityConfig = {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? config.server.corsOrigin
      : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
    maxAge: 86400
  },
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'", 'https://api.openai.com']
  },
  session: {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }
} as const;

// Enhanced helmet configuration
export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: securityConfig.csp
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

// Request size limits
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 10 * 1024 * 1024) { // 10MB
    return res.status(413).json({
      status: 'error',
      message: 'Request entity too large'
    });
  }
  next();
};

// Custom security headers middleware with improved typing
export const customSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Set Content-Security-Policy
  const csp = Object.entries(securityConfig.csp)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()} ${value.join(' ')}`)
    .join('; ');
  res.setHeader('Content-Security-Policy', csp);
  
  // Set CORS headers for development
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', securityConfig.cors.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', securityConfig.cors.allowedHeaders.join(', '));
  }

  next();
};

// Audit logging middleware
export const auditLog = (req: Request, res: Response, next: NextFunction): void => {
  const logData = {
    timestamp: new Date(),
    userId: req.user?.id || 'anonymous',
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    origin: req.get('origin'),
    referrer: req.get('referrer'),
    requestId: req.id,
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
  if ((req as any).securityViolation) {
    auditLogger.warn('Security violation detected', {
      ...logData,
      violation: (req as any).securityViolation
    });
  }

  next();
};

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
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

// Session configuration
export const sessionMiddleware = session({
  ...securityConfig.session,
  store: MongoStore.create({
    mongoUrl: config.database.uri,
    crypto: {
      secret: process.env.SESSION_ENCRYPT_SECRET || 'session-encrypt-secret'
    }
  })
});

// IP blocking middleware
const blockedIPs = new Set<string>();

export const ipBlocker = (req: Request, res: Response, next: NextFunction): void => {
  const clientIp = req.ip;
  
  if (blockedIPs.has(clientIp)) {
    auditLogger.warn('Blocked IP attempted access', { ip: clientIp });
    return res.status(403).json({
      status: 'error',
      message: 'Access denied'
    });
  }

  next();
};

// Combine all security middleware
export const securityMiddlewares = [
  securityMiddleware,
  rateLimiters.api,
  requestSizeLimiter,
  sessionMiddleware,
  mongoSanitize(),
  xss(),
  hpp(),
  ipBlocker,
  sanitizeRequest,
  auditLog
];

// Typed CORS configuration
export const corsOptions = securityConfig.cors;

// Typed cookie security options
export const cookieOptions = securityConfig.cookie; 