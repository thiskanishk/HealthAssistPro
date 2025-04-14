import logger from './logger';
import { Request } from 'express';

class ErrorMonitoring {
  private errorCounts: Map<string, number> = new Map();
  private readonly ALERT_THRESHOLD = 10;
  private readonly TIME_WINDOW = 5 * 60 * 1000; // 5 minutes

  trackError(error: Error, context: any = {}) {
    const errorKey = `${error.name}:${error.message}`;
    const currentCount = (this.errorCounts.get(errorKey) || 0) + 1;
    this.errorCounts.set(errorKey, currentCount);

    if (currentCount >= this.ALERT_THRESHOLD) {
      this.triggerAlert(error, currentCount, context);
      this.errorCounts.delete(errorKey); // Reset counter after alert
    }

    // Reset counters after time window
    setTimeout(() => {
      this.errorCounts.delete(errorKey);
    }, this.TIME_WINDOW);
  }

  private triggerAlert(error: Error, count: number, context: any) {
    logger.error('Error threshold exceeded', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        count,
        context
      }
    });

    // Here you could integrate with external monitoring services
    // For example: Sentry, DataDog, etc.
  }
}

class RateLimitMonitoring {
  private rateLimitHits: Map<string, number> = new Map();
  private readonly ALERT_THRESHOLD = 50;
  private readonly TIME_WINDOW = 5 * 60 * 1000; // 5 minutes

  logRateLimitHit(req: Request, limitName: string) {
    const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
    const key = `${limitName}:${clientIP}`;
    const currentCount = (this.rateLimitHits.get(key) || 0) + 1;
    this.rateLimitHits.set(key, currentCount);

    if (currentCount >= this.ALERT_THRESHOLD) {
      this.triggerAlert(limitName, clientIP, currentCount);
      this.rateLimitHits.delete(key); // Reset counter after alert
    }

    // Reset counters after time window
    setTimeout(() => {
      this.rateLimitHits.delete(key);
    }, this.TIME_WINDOW);

    // Log the rate limit hit
    logger.warn('Rate limit hit', {
      limitName,
      clientIP,
      count: currentCount,
      path: req.path,
      method: req.method
    });
  }

  private triggerAlert(limitName: string, clientIP: string, count: number) {
    logger.error('Rate limit threshold exceeded', {
      limitName,
      clientIP,
      count,
      threshold: this.ALERT_THRESHOLD
    });

    // Here you could integrate with external monitoring services
    // For example: Sentry, DataDog, etc.
  }
}

export const errorMonitoring = new ErrorMonitoring();
export const rateLimitMonitoring = new RateLimitMonitoring(); 