import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config';
import { setAuthCookies, clearAuthCookies } from '../middleware/cookieAuth';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user || !await user.comparePassword(password)) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials'
        });
      }

      const tokens = {
        accessToken: jwt.sign(
          { userId: user._id },
          config.jwt.secret,
          { expiresIn: '15m' }
        ),
        refreshToken: jwt.sign(
          { userId: user._id },
          config.jwt.refreshSecret,
          { expiresIn: '7d' }
        )
      };

      // Set HTTP-only cookies
      setAuthCookies(res, tokens);

      res.json({
        status: 'success',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Login failed'
      });
    }
  }

  async logout(req: Request, res: Response) {
    clearAuthCookies(res);
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  }
} 