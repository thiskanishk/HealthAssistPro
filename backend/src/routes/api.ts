import { Router } from 'express';
import authRoutes from './auth';
import patientRoutes from './patients';
import diagnosisRoutes from './diagnosis';
import prescriptionRoutes from './prescriptions';
import { authenticate } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// Apply rate limiting to all API routes
router.use(apiLimiter);

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use(authenticate);
router.use('/patients', patientRoutes);
router.use('/diagnosis', diagnosisRoutes);
router.use('/prescriptions', prescriptionRoutes);

export default router; 