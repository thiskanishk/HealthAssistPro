const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'Account is not active'
      });
    }

    // Check session timeout
    const tokenIssuedAt = new Date(decoded.iat * 1000);
    const timeoutMinutes = config.session.timeoutMinutes;
    const sessionExpiry = new Date(tokenIssuedAt.getTime() + timeoutMinutes * 60000);

    if (sessionExpiry < new Date()) {
      return res.status(401).json({
        status: 'error',
        message: 'Session expired'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Role-based access control middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Verify email middleware
const requireEmailVerified = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      status: 'error',
      message: 'Email verification required'
    });
  }
  next();
};

// Activity logging middleware
const logActivity = (activityType) => {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function (data) {
      res.send = originalSend;
      
      // Log the activity after response is sent
      setImmediate(() => {
        const activity = {
          user: req.user?._id,
          activityType,
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          timestamp: new Date(),
          status: res.statusCode
        };

        // Here you would typically save this to your activity log collection
        // ActivityLog.create(activity).catch(console.error);
      });

      return res.send(data);
    };
    next();
  };
};

const isOwnerOrAdmin = async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const userId = req.user.id;

    if (req.user.role === 'admin') {
      return next();
    }

    if (resourceId === userId) {
      return next();
    }

    return res.status(403).json({
      message: 'You do not have permission to access this resource'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  verifyToken,
  authorize,
  requireEmailVerified,
  logActivity,
  isOwnerOrAdmin
}; 