import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import { UserRole } from '../types/user';
import { User } from '../models/User';
import { ActivityLog } from '../models/ActivityLog';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        roles: UserRole[];
        isEmailVerified?: boolean;
        status?: string;
        [key: string]: any;
      };
    }
  }
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (user.status !== 'active') {
      throw new AppError('Account is not active', 403);
    }

    // Check session timeout
    const tokenIssuedAt = new Date(decoded.iat * 1000);
    const timeoutMinutes = config.session.timeoutMinutes;
    const sessionExpiry = new Date(tokenIssuedAt.getTime() + timeoutMinutes * 60000);

    if (sessionExpiry < new Date()) {
      throw new AppError('Session expired', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Internal server error', 500));
    }
  }
};

export const requireRoles = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401));
    }

    const hasRequiredRole = req.user.roles.some(role => roles.includes(role));
    
    if (!hasRequiredRole) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

export const requireEmailVerified = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isEmailVerified) {
    return next(new AppError('Email verification required', 403));
  }
  next();
};

interface ActivityLogData {
  user?: string;
  activityType: string;
  endpoint: string;
  method: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  status: number;
}

export const logActivity = (activityType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    res.send = function (data) {
      res.send = originalSend;
      
      // Log the activity after response is sent
      setImmediate(async () => {
        const activity: ActivityLogData = {
          user: req.user?._id,
          activityType,
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('user-agent') || '',
          timestamp: new Date(),
          status: res.statusCode
        };

        try {
          await ActivityLog.create(activity);
        } catch (error) {
          console.error('Failed to log activity:', error);
        }
      });

      return res.send(data);
    };
    next();
  };
};

export const isOwnerOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resourceId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return next(new AppError('User not authenticated', 401));
    }

    if (req.user?.roles.includes('admin')) {
      return next();
    }

    if (resourceId === userId) {
      return next();
    }

    return next(new AppError('You do not have permission to access this resource', 403));
  } catch (error) {
    return next(new AppError('Internal server error', 500));
  }
};