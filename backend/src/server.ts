import { Request, Response, NextFunction } from 'express';
import express from 'express';
import mongoose from 'mongoose';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { MongoError } from 'mongodb';
import logger from './services/logger';
import config from './config';
import expressApp from './app';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes/api';

// Validate required environment variables
const requiredEnvVars = [
  { key: 'MONGODB_URI', value: config.database.uri },
  { key: 'JWT_SECRET', value: config.jwt.secret },
  { key: 'PORT', value: config.server.port.toString() }
];

requiredEnvVars.forEach(({ key, value }) => {
  if (!value || value === 'undefined') {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const app = expressApp;

// Configure CORS with proper options
const corsOptions: CorsOptions = {
    origin: config.server.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Basic security middleware
app.use(helmet());
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: `${config.server.maxFileSize}b` }));
app.use(express.urlencoded({ extended: true, limit: `${config.server.maxFileSize}b` }));

// Logging middleware
app.use(morgan(config.server.env === 'development' ? 'dev' : 'combined', {
    stream: {
        write: (message) => logger.info(message.trim()),
    },
}));

// Configure rate limiting
const limiter = rateLimit({
    windowMs: config.server.rateLimiting?.windowMs || 15 * 60 * 1000, // default: 15 minutes
    max: config.server.rateLimiting?.maxRequests || 100, // default: 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to API routes
app.use('/api', limiter);

// Add security headers
app.use(helmet.contentSecurityPolicy());
app.use(helmet.crossOriginEmbedderPolicy());
app.use(helmet.crossOriginOpenerPolicy());
app.use(helmet.crossOriginResourcePolicy());
app.use(helmet.dnsPrefetchControl());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.originAgentCluster());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.referrerPolicy());
app.use(helmet.xssFilter());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    const healthcheck = {
        uptime: process.uptime(),
        status: 'UP',
        timestamp: Date.now(),
        mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };
    res.status(200).json(healthcheck);
});

// API Routes with versioning
app.use('/api/v1', apiRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

// Connect to MongoDB with retry logic
const connectWithRetry = async (retries = 5, interval = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await mongoose.connect(config.database.uri, config.database.options);
            logger.info('Connected to MongoDB successfully');

            // Handle MongoDB connection errors
            mongoose.connection.on('error', (error: MongoError) => {
                logger.error('MongoDB connection error:', { error: error.message, code: error.code });
                if (error.code === 'ETIMEDOUT') {
                    logger.info('Attempting to reconnect to MongoDB...');
                    mongoose.connect(config.database.uri, config.database.options);
                }
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB disconnected. Attempting to reconnect...');
                mongoose.connect(config.database.uri, config.database.options);
            });

            process.on('SIGINT', () => {
                mongoose.connection.close(false).then(() => {
                    logger.info('MongoDB connection closed through app termination');
                    process.exit(0);
                });
            });

            return startServer();
        } catch (error: any) {
            if (i === retries - 1) {
                logger.error('Failed to connect to MongoDB after multiple retries:', { 
                    error: error.message,
                    code: error instanceof MongoError ? error.code : 'UNKNOWN'
                });
                process.exit(1);
            }
            logger.warn(`Failed to connect to MongoDB. Retrying in ${interval / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
};

// Start the server
function startServer() {
    const server = app.listen(config.server.port, () => {
        logger.info(`Server is running on port ${config.server.port} in ${config.server.env} mode`);
        logger.info(`Health check available at ${config.server.apiUrl}/health`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.syscall !== 'listen') {
            throw error;
        }

        const bind = typeof config.server.port === 'string'
            ? 'Pipe ' + config.server.port
            : 'Port ' + config.server.port;

        // Handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                logger.error(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                logger.error(`${bind} is already in use`);
                process.exit(1);
                break;
            default:
                logger.error('Server startup error:', { code: error.code, message: error.message });
                throw error;
        }
    });

    // Graceful shutdown handler
    const gracefulShutdown = (signal: string) => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        server.close(() => {
            logger.info('HTTP server closed.');
            mongoose.connection.close(false).then(() => {
                logger.info('MongoDB connection closed.');
                process.exit(0);
            }).catch(err => {
                logger.error('Error closing MongoDB connection:', err);
                process.exit(1);
            });
        });

        // Force shutdown after timeout
        setTimeout(() => {
            logger.error('Could not close connections in time, forcing shutdown.');
            process.exit(1);
        }, 10000);
    };

    // Handle process termination
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Global Error Handlers
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', { message: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
    process.exit(1);
});

// Start the application
connectWithRetry();
