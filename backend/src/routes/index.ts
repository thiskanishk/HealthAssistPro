import { Router } from 'express';
import { AppError } from '../errors/AppError';
import { ErrorCode, HttpStatus } from '../types/api.types';
import medicationUtilsRoutes from './medicationUtils';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString()
        }
    });
});

// Import and use other route modules
// TODO: Add other route imports here
// Example:
// import authRoutes from './auth.routes';
// router.use('/auth', authRoutes);

// Register medication utility routes
router.use('/medication-utils', medicationUtilsRoutes);

// 404 handler for unmatched routes
router.use((req, res, next) => {
    next(new AppError(
        `Route ${req.originalUrl} not found`,
        ErrorCode.NOT_FOUND,
        HttpStatus.NOT_FOUND
    ));
});

export default router; 