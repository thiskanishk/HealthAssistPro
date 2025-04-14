import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../utils/errors';
import config from '../config/server.config';
import { Redis } from 'ioredis';
import logger from '../utils/logger';

const redis = new Redis(config.redis.url);

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = extractToken(req);
        if (!token) {
            throw new AuthenticationError('No token provided');
        }

        // Check if token is blacklisted
        const isBlacklisted = await redis.get(`blacklist:${token}`);
        if (isBlacklisted) {
            throw new AuthenticationError('Token is invalid');
        }

        const decoded = jwt.verify(token, config.server.security.jwtSecret);
        req.user = decoded;

        // Update last activity
        await redis.set(`activity:${decoded.id}`, Date.now(), 'EX', 86400);

        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        next(new AuthenticationError('Invalid token'));
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AuthenticationError());
        }

        if (!roles.includes(req.user.role)) {
            return next(new AuthenticationError('Insufficient permissions'));
        }

        next();
    };
};

const extractToken = (req: Request): string | null => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return null;
}; 