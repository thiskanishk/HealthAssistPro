import { Router } from 'express';
import { MedicalHistoryController } from '../controllers/MedicalHistoryController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { medicalHistoryValidation } from '../validators/medicalHistoryValidation';
import { cacheMiddleware } from '../middleware/cache';
import { invalidateCache } from '../utils/cacheInvalidation';

const router = Router();
const controller = new MedicalHistoryController();

/**
 * @swagger
 * /api/medical-history/{patientId}:
 *   get:
 *     summary: Get patient's medical history
 *     tags: [Medical History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 */
router.get(
    '/:patientId',
    authenticate,
    authorize(['doctor', 'nurse']),
    cacheMiddleware({ ttl: 600, keyPrefix: 'medical-history' }), // 10 minutes cache
    controller.getPatientHistory
);

/**
 * @swagger
 * /api/medical-history/{patientId}/timeline:
 *   get:
 *     summary: Get patient's medical timeline
 *     tags: [Medical History]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    '/:patientId/timeline',
    authenticate,
    authorize(['doctor', 'nurse', 'patient']),
    controller.getPatientTimeline
);

/**
 * @swagger
 * /api/medical-history/{patientId}/event:
 *   post:
 *     summary: Add medical event to patient's history
 *     tags: [Medical History]
 *     security:
 *       - bearerAuth: []
 */
router.post(
    '/:patientId/event',
    authenticate,
    authorize(['doctor']),
    validate(medicalHistoryValidation.addEvent),
    async (req, res, next) => {
        try {
            await controller.addMedicalEvent(req, res, next);
            await invalidateCache.patientData(req.params.patientId);
        } catch (error) {
            next(error);
        }
    }
);

export default router; 