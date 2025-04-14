import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { monitorRateLimits } from '../services/monitoring';

// Base rate limiter configuration
const createLimiter = (
  windowMs: number,
  max: number,
  message: string,
  limitName: string
) => rateLimit({
  windowMs,
  max,
  message: JSON.stringify({
    status: 'error',
    message
  }),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    monitorRateLimits.logRateLimitHit(req, limitName);
    res.status(429).json({
      status: 'error',
      message
    });
  }
});

// Different rate limiters for different endpoints
export const rateLimiters = {
  // Auth endpoints - stricter limits
  auth: createLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 requests per window
    'Too many login attempts. Please try again after 15 minutes.',
    'auth'
  ),

  // API endpoints - general limit
  api: createLimiter(
    60 * 1000, // 1 minute
    30, // 30 requests per minute
    'Too many requests. Please try again later.',
    'api'
  ),

  // Health check endpoints - more lenient
  health: createLimiter(
    60 * 1000, // 1 minute
    100, // 100 requests per minute
    'Too many health check requests.',
    'health'
  ),

  // File upload endpoints
  upload: createLimiter(
    60 * 60 * 1000, // 1 hour
    10, // 10 uploads per hour
    'Upload limit reached. Please try again later.',
    'upload'
  ),

  // Search endpoints
  search: createLimiter(
    60 * 1000, // 1 minute
    20, // 20 searches per minute
    'Search limit reached. Please try again later.',
    'search'
  )
};

// IP whitelist for internal services
const whitelistedIPs = new Set([
  '127.0.0.1',
  'localhost',
  // Add your internal service IPs here
]);

// Middleware to skip rate limiting for whitelisted IPs
export const skipIfWhitelisted = (req: Request, res: Response) => {
  const clientIP = req.ip || req.socket.remoteAddress;
  return clientIP ? whitelistedIPs.has(clientIP) : false;
}; 