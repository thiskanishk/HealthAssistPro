import { Express, Request, Response, NextFunction } from 'express';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import logger from './services/logger';
import config from './config';
import expressApp from './app';
import userRoutes from './routes/user.routes';
import patientRoutes from './routes/patient.routes';
import appointmentRoutes from './routes/appointment.routes';
import healthRecordRoutes from './routes/healthRecord.routes';

const app: Express = expressApp;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(config.database.uri, config.database.options)
    .then(() => {
        logger.info('Connected to MongoDB');
        startServer();
    })
    .catch((error) => {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    });

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});

// Import and use routes
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/health-records', healthRecordRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start the server
function startServer() {
    const server = app.listen(config.server.port, () => {
        logger.info(`Server is running on port ${config.server.port} in ${config.server.env} mode`);
        logger.info(`API is available at ${config.server.apiUrl}`);
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
                throw error;
        }
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
        logger.info('Received shutdown signal');
        server.close(() => {
            logger.info('Server closed');
            mongoose.connection.close(() => {
                logger.info('MongoDB connection closed');
                process.exit(0);
            });
        });

        // If server hasn't finished in 10 seconds, shut down forcefully
        setTimeout(() => {
            logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    // Ensure we flush logs before exiting
    logger.on('finish', () => {
        process.exit(1);
    });
    logger.end();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error('Unhandled Rejection:', {
        reason,
        promise
    });
    // Ensure we flush logs before exiting
    logger.on('finish', () => {
        process.exit(1);
    });
    logger.end();
}); 