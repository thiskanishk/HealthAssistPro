import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { securityMiddleware, customSecurityHeaders, corsOptions } from './middleware/security';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import routes from './routes';

const app = express();

// Security middleware
app.use(securityMiddleware);
app.use(customSecurityHeaders);

// CORS configuration
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

export default app; 