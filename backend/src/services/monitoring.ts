import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/rate-limits.log' }),
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

export const monitorRateLimits = {
  logRateLimitHit: (req: Express.Request, limit: string) => {
    logger.warn({
      message: 'Rate limit exceeded',
      limit,
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
  }
}; 