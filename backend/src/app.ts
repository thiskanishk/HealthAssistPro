import express from 'express';
import { rateLimiters, skipIfWhitelisted } from './middleware/rateLimit';

const app = express();

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

// ... rest of your app configuration 