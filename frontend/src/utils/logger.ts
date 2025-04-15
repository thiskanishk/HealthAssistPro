/**
 * Logger utility for the application
 * In a production environment, this would send logs to a backend service
 */

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Simple console logger with meta data support
export const logError = (message: string, meta?: Record<string, unknown>): void => {
  console.error(`[ERROR] ${message}`, meta);
  
  // In production, you'd send this to a logging service like Sentry
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service
    // Example: Sentry.captureException(meta?.error || new Error(message));
  }
};

export const logWarn = (message: string, meta?: Record<string, unknown>): void => {
  console.warn(`[WARN] ${message}`, meta);
};

export const logInfo = (message: string, meta?: Record<string, unknown>): void => {
  console.info(`[INFO] ${message}`, meta);
};

export const logDebug = (message: string, meta?: Record<string, unknown>): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[DEBUG] ${message}`, meta);
  }
};

/**
 * Main logger function that allows specifying the log level
 */
export const log = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
  switch (level) {
    case LogLevel.ERROR:
      logError(message, meta);
      break;
    case LogLevel.WARN:
      logWarn(message, meta);
      break;
    case LogLevel.INFO:
      logInfo(message, meta);
      break;
    case LogLevel.DEBUG:
      logDebug(message, meta);
      break;
    default:
      console.log(`[LOG] ${message}`, meta);
  }
};

export default {
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
  log
}; 