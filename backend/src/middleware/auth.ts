import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create a simple AppError class
class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

// Define UserRole type
type UserRole = 'admin' | 'doctor' | 'nurse' | 'patient' | 'user';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        roles: UserRole[];
        isEmailVerified?: boolean;
        status?: string;
        role?: string;
      };
    }
  }
}

// Main authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

// Token verification middleware
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          role: true,
          isEmailVerified: true,
          status: true
        }
      });

      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Check if user is active
      if (user.status !== 'active') {
        return res.status(401).json({
          status: 'error',
          message: 'Account is not active'
        });
      }

      // Attach user to request object
      req.user = {
        id: user.id,
        roles: [user.role as UserRole],
        isEmailVerified: user.isEmailVerified,
        status: user.status
      };

      next();
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Role-based access control middleware
export const requireRoles = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const hasRole = roles.some(role => req.user?.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Legacy function for compatibility
export const authorizeRoles = (...allowedRoles: string[]) => {
  return requireRoles(allowedRoles as UserRole[]);
};

// Email verification middleware
export const requireEmailVerified = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isEmailVerified) {
    return res.status(403).json({
      status: 'error',
      message: 'Email verification required'
    });
  }
  next();
};

// Activity logging middleware
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
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function (body: any): Response {
      res.send = originalSend;
      
      const activityData: ActivityLogData = {
        user: req.user?.id,
        activityType,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent') || '',
        timestamp: new Date(),
        status: res.statusCode
      };

      // Log activity to database
      prisma.activityLog.create({
        data: activityData
      }).catch(err => {
        console.error('Error logging activity:', err);
      });

      return originalSend.call(this, body);
    };

    next();
  };
};

// Owner or admin check middleware
export const isOwnerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.userId || req.body.userId;
  
  if (!userId) {
    return res.status(400).json({
      status: 'error',
      message: 'User ID is required'
    });
  }

  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }

  if (req.user.id === userId || req.user.roles.includes('admin')) {
    next();
  } else {
    res.status(403).json({
      status: 'error',
      message: 'Insufficient permissions'
    });
  }
};
