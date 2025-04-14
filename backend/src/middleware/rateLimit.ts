import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Redis } from 'ioredis';
import config from '../config/server.config';

const redis = new Redis(config.redis.url);

export const apiLimiter = rateLimit({
    store: new RedisStore({
        client: redis,
        prefix: 'rate-limit:'
    }),
    windowMs: config.server.rateLimiting.windowMs,
    max: config.server.rateLimiting.max,
    message: {
        status: 'error',
        message: 'Too many requests, please try again later.'
    }
});

export const loginLimiter = rateLimit({
    store: new RedisStore({
        client: redis,
        prefix: 'login-limit:'
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per hour
    message: {
        status: 'error',
        message: 'Too many login attempts, please try again later.'
    }
}); 