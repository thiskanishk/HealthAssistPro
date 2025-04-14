import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logDir = 'logs';
const isDevelopment = process.env.NODE_ENV === 'development';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: isDevelopment ? 'debug' : 'info',
    format: logFormat,
    defaultMeta: { service: 'health-assist-pro' },
    transports: [
        // Write all logs with level 'error' and below to 'error.log'
        new DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
        }),

        // Write all logs with level 'info' and below to 'combined.log'
        new DailyRotateFile({
            filename: path.join(logDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
        }),
    ],
});

// If we're in development, log to the console with colors
if (isDevelopment) {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
    }));
}

// Create a stream object for Morgan middleware
export const stream = {
    write: (message: string) => {
        logger.info(message.trim());
    },
};

// Create middleware for Express
export const loggerMiddleware = (req: any, res: any, next: any) => {
    const start = Date.now();

    // Log when the request ends
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request completed', {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('user-agent'),
            ip: req.ip,
            userId: req.user?.id,
        });
    });

    next();
};

// Export logger instance
export default logger; 