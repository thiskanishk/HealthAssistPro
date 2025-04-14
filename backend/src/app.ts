import express from 'express';
import { rateLimiters, skipIfWhitelisted } from './middleware/rateLimit';
import { loggerMiddleware } from './services/logger';
import { errorHandler } from './middleware/errorHandler';
import { AppError } from './utils/errors';

const app = express();
const refreshTokenRoute = require('./routes/refreshToken');

// Add logging middleware
app.use(loggerMiddleware);

// Apply rate limiters to specific routes
app.use('/api/auth', rateLimiters.auth);
app.use('/api/upload', rateLimiters.upload);
app.use('/api/search', rateLimiters.search);
app.use('/health', rateLimiters.health);

// Apply general API rate limit to all other routes
app.use('/api', (req, res, next) => {
  if (skipIfWhitelisted(req, res)) {
    return next();
  }
  return rateLimiters.api(req, res, next);
});

// Add routes
app.use('/api/v1', routes);

// 404 handler
app.use((req, res, next) => {
  next(AppError.notFound(`Route ${req.originalUrl} not found`));
});

// Global error handler
app.use(errorHandler);

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason,
    promise
  });
  process.exit(1);
});

// ... rest of your app configuration 