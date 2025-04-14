import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache';

interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
}

export const cacheMiddleware = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${options.keyPrefix || 'cache'}:${req.originalUrl}`;

    try {
      const cachedData = await cacheService.get(key);
      if (cachedData) {
        return res.json(cachedData);
      }

      // Store original res.json to intercept the response
      const originalJson = res.json.bind(res);
      res.json = ((data: any) => {
        cacheService.set(key, data, options.ttl);
        return originalJson(data);
      }) as any;

      next();
    } catch (error) {
      next(error);
    }
  };
}; 