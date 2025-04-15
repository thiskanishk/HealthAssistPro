import winston from 'winston';
import config from '../config/server.config';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const customFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
        log += ` ${JSON.stringify(metadata)}`;
    }
    
    if (stack) {
        log += `\n${stack}`;
    }
    
    return log;
});

const logger = winston.createLogger({
    level: config.server.logging.level || 'info',
    format: combine(
        timestamp(),
        errors({ stack: true }),
        customFormat
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp(),
                customFormat
            )
        })
    ]
});

export default logger;
