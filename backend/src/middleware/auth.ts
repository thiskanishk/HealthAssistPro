import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Create a simple AppError class if it doesn't exist
class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

// Define UserRole type if it doesn't exist
type UserRole = 'admin' | 'doctor' | 'nurse' | 'patient' | 'user';

// Import User model with proper fallbacks
import { User } from '../models/User';

// ActivityLog implementation
interface IActivityLog {
  user?: string;
  activityType: string;
  endpoint: string;
  method: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  status: number;
}

// Simple ActivityLog model
const ActivityLog = {
  create: async (data: IActivityLog) => {
    console.log('[Activity Log]', data);
    return Promise.resolve(data);
  }
};

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        roles: UserRole[];
        isEmailVerified?: boolean;
        status?: string;
        role?: string; // For legacy compatibility
        _id?: string; // Mongoose ObjectId as string
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

    // Check session timeout with proper type checking
    const tokenIssuedAt = new Date((decoded.iat || 0) * 1000);
    
    // Default session timeout if not configured
    const timeoutMinutes = 60; // Default to 60 minutes
    const sessionExpiry = new Date(tokenIssuedAt.getTime() + timeoutMinutes * 60000);

    if (sessionExpiry < new Date()) {
      throw new AppError('Session expired', 401);
    }

    // Convert Mongoose document to plain object if possible
    const userObj = typeof user.toObject === 'function' ? user.toObject() : user;
    
    // Start with the base properties needed for the request object
    const userProperties = {
      ...userObj,
      id: user._id.toString(),
      _id: user._id.toString(),
      roles: [user.role || 'user'], // Default to a single role based on user.role
    };
    
    // Safely remove any Mongoose internal properties
    if (userProperties && typeof userProperties === 'object') {
      // Use a type guard to safely check and delete properties
      const anyProps = userProperties as any;
      if (anyProps._doc) delete anyProps._doc;
    }
    
    // Set the user object on the request
    req.user = userProperties;
    
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

    const hasRequiredRole = req.user.roles.some(role => roles.includes(role as UserRole));
    
    if (!hasRequiredRole) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

// Legacy function for compatibility with older JS code that uses authorizeRoles
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
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
          ip: req.ip || 'unknown', // Handle potentially undefined IP
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