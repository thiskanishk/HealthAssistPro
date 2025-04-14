const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

const apiLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        status: 'error',
        message: 'Too many requests, please try again later.'
    }
});

const authLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
        status: 'error',
        message: 'Too many login attempts, please try again later.'
    }
});

module.exports = {
    apiLimiter,
    authLimiter
}; 