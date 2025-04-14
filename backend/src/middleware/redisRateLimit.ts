import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';
import { monitorRateLimits } from '../services/monitoring';

const redis = new Redis(process.env.REDIS_URL);

export class RedisRateLimiter {
  constructor(
    private prefix: string,
    private windowMs: number,
    private max: number
  ) {}

  middleware = async (req: Request, res: Response, next: NextFunction) => {
    const key = `${this.prefix}:${req.ip}`;
    
    try {
      const [current] = await redis
        .multi()
        .incr(key)
        .expire(key, this.windowMs / 1000)
        .exec();

      const count = current?.[1] as number;

      res.setHeader('X-RateLimit-Limit', this.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.max - count));

      if (count > this.max) {
        monitorRateLimits.logRateLimitHit(req, this.prefix);
        return res.status(429).json({
          status: 'error',
          message: 'Too many requests'
        });
      }

      next();
    } catch (error) {
      // Fail open if Redis is down
      console.error('Redis rate limiter error:', error);
      next();
    }
  };
} 