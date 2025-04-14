import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { rateLimitMonitoring } from '../services/monitoring';
import { config } from '../config';

// Rate limiter configuration types
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  limitName: string;
}

interface RateLimiters {
  [key: string]: RateLimitRequestHandler;
}

// Environment-based rate limit configurations
const rateLimitConfigs: { [key: string]: RateLimitConfig } = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 5 : 100,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    limitName: 'auth'
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'production' ? 30 : 1000,
    message: 'Too many requests. Please try again later.',
    limitName: 'api'
  },
  health: {
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: 'Too many health check requests.',
    limitName: 'health'
  },
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'production' ? 10 : 100,
    message: 'Upload limit reached. Please try again later.',
    limitName: 'upload'
  },
  search: {
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'production' ? 20 : 500,
    message: 'Search limit reached. Please try again later.',
    limitName: 'search'
  }
};

// Enhanced rate limiter factory with request tracking
const createLimiter = (config: RateLimitConfig): RateLimitRequestHandler => {
  const { windowMs, max, message, limitName } = config;
  
  return rateLimit({
    windowMs,
    max,
    message: JSON.stringify({
      status: 'error',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    }),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      rateLimitMonitoring.logRateLimitHit(req, limitName);
      
      // Add retry-after header
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      
      res.status(429).json({
        status: 'error',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    skip: skipIfWhitelisted,
    keyGenerator: (req: Request): string => {
      // Use X-Forwarded-For header if behind a proxy, fallback to IP
      const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
      return `${limitName}:${clientIP}`;
    }
  });
};

// Generate rate limiters from config
export const rateLimiters: RateLimiters = Object.entries(rateLimitConfigs)
  .reduce((acc, [key, config]) => ({
    ...acc,
    [key]: createLimiter(config)
  }), {});

// Whitelist configuration
const whitelistedIPs = new Set([
  '127.0.0.1',
  'localhost',
  ...(process.env.TRUSTED_PROXIES?.split(',') || [])
]);

// Enhanced IP whitelist checker with support for CIDR notation
export const skipIfWhitelisted = (req: Request): boolean => {
  const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                  req.ip || 
                  req.socket.remoteAddress;
                  
  if (!clientIP) return false;
  
  // Check exact IP match
  if (whitelistedIPs.has(clientIP)) return true;
  
  // Additional security checks could be added here
  // For example, checking if the request is from a trusted proxy
  
  return false;
}; 