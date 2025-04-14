import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
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

    const decoded = jwt.verify(accessToken, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    // Try to refresh the token if the access token is expired
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh token provided');
      }

      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const newAccessToken = jwt.sign(
        { userId: decoded.userId },
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

      req.user = decoded;
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