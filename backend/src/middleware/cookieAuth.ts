import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '../config';
import { UserRole } from '../types/auth';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Our internal JwtPayload with additional fields
interface CustomJwtPayload extends JwtPayload {
  userId: string;
  roles?: UserRole[];
  isEmailVerified?: boolean;
}

export const setAuthCookies = (res: Response, tokens: AuthTokens): void => {
  // Set access token cookie
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  // Set refresh token cookie
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

export const authenticateCookie = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accessToken = req.cookies.accessToken;
    
    if (!accessToken) {
      throw new Error('No access token provided');
    }

    const decoded = jwt.verify(accessToken, config.jwt.secret) as CustomJwtPayload;
    
    // Set user object with proper type safeguards
    if (decoded && decoded.userId) {
      req.user = {
        id: decoded.userId,
        roles: decoded.roles || ['user'],
        isEmailVerified: decoded.isEmailVerified || false,
        _id: decoded.userId
      };
      next();
    } else {
      throw new Error('Invalid token payload');
    }
  } catch (error) {
    // Try to refresh the token if the access token is expired
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh token provided');
      }

      // Use appropriate secret for refresh token verification
      const refreshSecret = config.jwt.refreshSecret || config.jwt.secret;
      const decoded = jwt.verify(refreshToken, refreshSecret) as CustomJwtPayload;
      
      if (!decoded || !decoded.userId) {
        throw new Error('Invalid refresh token');
      }
      
      const newAccessToken = jwt.sign(
        { 
          userId: decoded.userId,
          roles: decoded.roles || ['user'],
          isEmailVerified: decoded.isEmailVerified
        },
        config.jwt.secret,
        { expiresIn: '15m' }
      );

      // Set new access token
      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000
      });

      // Set user object with proper type safeguards
      req.user = {
        id: decoded.userId,
        roles: decoded.roles || ['user'],
        isEmailVerified: decoded.isEmailVerified || false,
        _id: decoded.userId
      };
      
      next();
    } catch (refreshError) {
      clearAuthCookies(res);
      res.status(401).json({
        status: 'error',
        message: 'Authentication failed'
      });
    }
  }
}; 