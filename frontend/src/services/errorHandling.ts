import * as Sentry from '@sentry/react';
import logger from '../utils/logger';

interface ErrorMetadata {
  error?: Error;
  context?: Record<string, unknown>;
  tags?: Record<string, string>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
}

class ErrorHandlingService {
  private initialized = false;

  initialize(dsn?: string): void {
    if (this.initialized || !dsn) return;

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      beforeSend(event: Sentry.Event) {
        if (process.env.NODE_ENV === 'development') {
          return null;
        }
        return event;
      },
    });

    this.initialized = true;
  }

  setUser(user: ErrorMetadata['user']): void {
    if (user) {
      Sentry.setUser(user);
    } else {
      Sentry.setUser(null);
    }
  }

  captureError(error: Error | string, metadata?: ErrorMetadata): void {
    const errorInstance = typeof error === 'string' ? new Error(error) : error;

    // Log locally
    logger.error(errorInstance.message, {
      error: errorInstance,
      ...metadata?.context,
    });

    // Send to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      const scope = new Sentry.Scope();
      
      if (metadata?.tags) {
        scope.setTags(metadata.tags);
      }
      
      if (metadata?.context) {
        scope.setExtras(metadata.context);
      }

      Sentry.captureException(errorInstance, scope);
    }
  }

  captureMessage(message: string, metadata?: Omit<ErrorMetadata, 'error'>): void {
    // Log locally
    logger.info(message, metadata?.context);

    // Send to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      const scope = new Sentry.Scope();
      
      if (metadata?.tags) {
        scope.setTags(metadata.tags);
      }
      
      if (metadata?.context) {
        scope.setExtras(metadata.context);
      }

      Sentry.captureMessage(message, scope);
    }
  }
}

export const errorHandling = new ErrorHandlingService();
export default errorHandling;
