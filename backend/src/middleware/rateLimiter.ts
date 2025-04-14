import rateLimit from 'express-rate-limit';
import { ErrorCode, HttpStatus } from '../types/api.types';

export const createRateLimiter = (
    windowMs: number = 15 * 60 * 1000, // 15 minutes
    max: number = 100 // limit each IP to 100 requests per windowMs
) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            error: {
                code: ErrorCode.RATE_LIMIT_EXCEEDED,
                message: 'Too many requests from this IP, please try again later'
            }
        },
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });
};

// Create different rate limiters for different routes
export const authLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes for auth routes
export const apiLimiter = createRateLimiter(60 * 1000, 60); // 60 requests per minute for API routes
export const healthCheckLimiter = createRateLimiter(60 * 1000, 10); // 10 requests per minute for health checks 