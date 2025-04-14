# Security Guide

## Overview

This guide outlines security best practices and implementations for the HealthAssist Pro application.

## Security Measures

### 1. Authentication

#### JWT Implementation
```typescript
// services/auth.ts
import jwt from 'jsonwebtoken';
import { config } from '../config';

export const generateToken = (user: User): string => {
  return jwt.sign(
    { id: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, config.jwt.secret);
};
```

#### Password Hashing
```typescript
// utils/password.ts
import bcrypt from 'bcrypt';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

### 2. Authorization

#### Role-Based Access Control (RBAC)
```typescript
// middleware/rbac.ts
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
  DOCTOR = 'doctor'
}

export const requireRole = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions'
      });
    }
    next();
  };
};
```

#### Permission Checking
```typescript
// middleware/permissions.ts
export const checkResourceAccess = (resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const hasAccess = await checkUserAccess(req.user.id, resource);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }
    next();
  };
};
```

### 3. Data Protection

#### Encryption at Rest
```typescript
// utils/encryption.ts
import crypto from 'crypto';

export const encrypt = (text: string, key: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = cipher.update(text, 'utf8', 'hex');
  return encrypted + cipher.final('hex');
};

export const decrypt = (encrypted: string, key: string): string => {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  const decrypted = decipher.update(encrypted, 'hex', 'utf8');
  return decrypted + decipher.final('utf8');
};
```

#### Data Sanitization
```typescript
// middleware/sanitize.ts
import { sanitize } from 'class-sanitizer';

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  sanitize(req.body);
  next();
};
```

### 4. API Security

#### Rate Limiting
```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
```

#### CORS Configuration
```typescript
// config/cors.ts
import cors from 'cors';

export const corsOptions = {
  origin: ['https://healthassist.pro'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true,
  maxAge: 600 // 10 minutes
};
```

### 5. Input Validation

#### Request Validation
```typescript
// middleware/validate.ts
import { validate } from 'class-validator';

export const validateInput = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const errors = await validate(schema);
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    next();
  };
};
```

#### XSS Prevention
```typescript
// middleware/xss.ts
import xss from 'xss';

export const xssFilter = (req: Request, res: Response, next: NextFunction) => {
  req.body = JSON.parse(xss(JSON.stringify(req.body)));
  next();
};
```

### 6. Session Management

#### Session Configuration
```typescript
// config/session.ts
import session from 'express-session';

export const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};
```

#### Session Store
```typescript
// config/sessionStore.ts
import MongoStore from 'connect-mongo';

export const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  ttl: 24 * 60 * 60 // 24 hours
});
```

### 7. Secure Headers

#### Helmet Configuration
```typescript
// config/helmet.ts
import helmet from 'helmet';

export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss://api.healthassist.pro']
    }
  },
  referrerPolicy: { policy: 'same-origin' }
};
```

### 8. Logging and Monitoring

#### Security Logging
```typescript
// utils/securityLogger.ts
import winston from 'winston';

export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'security-service' },
  transports: [
    new winston.transports.File({ filename: 'security.log' })
  ]
});
```

#### Audit Trail
```typescript
// middleware/audit.ts
export const auditLog = (req: Request, res: Response, next: NextFunction) => {
  securityLogger.info('Security event', {
    user: req.user?.id,
    action: req.method,
    resource: req.path,
    ip: req.ip,
    timestamp: new Date()
  });
  next();
};
```

## Security Checklist

### Authentication
- [ ] Implement strong password policies
- [ ] Use secure session management
- [ ] Implement MFA where appropriate
- [ ] Handle password reset securely

### Authorization
- [ ] Implement RBAC
- [ ] Validate user permissions
- [ ] Secure API endpoints
- [ ] Implement resource-level access control

### Data Protection
- [ ] Encrypt sensitive data
- [ ] Implement secure key management
- [ ] Use HTTPS everywhere
- [ ] Implement proper data backup

### API Security
- [ ] Implement rate limiting
- [ ] Configure CORS properly
- [ ] Validate all inputs
- [ ] Use secure headers

### Monitoring
- [ ] Implement security logging
- [ ] Set up alerts for suspicious activity
- [ ] Regular security audits
- [ ] Monitor API usage

## Security Best Practices

### 1. Password Security
- Enforce minimum length (8 characters)
- Require complexity (letters, numbers, symbols)
- Implement maximum attempts
- Secure password reset flow

### 2. API Security
- Use HTTPS only
- Implement proper authentication
- Validate all inputs
- Rate limit requests

### 3. Data Security
- Encrypt sensitive data
- Implement proper access controls
- Regular security audits
- Secure backup procedures

### 4. Code Security
- Regular dependency updates
- Code review process
- Security testing
- Vulnerability scanning

## Incident Response

### 1. Detection
- Monitor security logs
- Set up alerts
- Review audit trails
- User reports

### 2. Response
- Assess impact
- Contain threat
- Notify affected users
- Document incident

### 3. Recovery
- Fix vulnerability
- Restore systems
- Update security measures
- Review and improve

## Security Updates

### 1. Regular Updates
- Update dependencies
- Patch vulnerabilities
- Review security configs
- Update documentation

### 2. Security Reviews
- Code reviews
- Penetration testing
- Security audits
- Vulnerability assessments

## Compliance

### 1. HIPAA Compliance
- Data encryption
- Access controls
- Audit logging
- Security policies

### 2. GDPR Compliance
- Data protection
- User consent
- Data portability
- Right to be forgotten 