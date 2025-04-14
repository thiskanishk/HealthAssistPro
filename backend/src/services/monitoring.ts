import { logger } from './logger';

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

export const errorMonitoring = new ErrorMonitoring(); 