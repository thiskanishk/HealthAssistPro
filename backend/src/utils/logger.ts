import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
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
    level: config.server.logging.level,
    format: combine(
        timestamp(),
        errors({ stack: true }),
        customFormat
    ),
    transports: [
        new DailyRotateFile({
            filename: `${config.server.logging.directory}/error-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxFiles: '30d'
        }),
        new DailyRotateFile({
            filename: `${config.server.logging.directory}/combined-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d'
        })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            colorize(),
            timestamp(),
            customFormat
        )
    }));
}

export default logger; 