import { Router } from 'express';
import { cacheMiddleware } from '../middleware/cache';
import { invalidateCache } from '../utils/cacheInvalidation';

const router = Router();

// Get patient list with caching
router.get(
  '/doctor/:doctorId/patients',
  cacheMiddleware({ ttl: 300, keyPrefix: 'patients' }), // 5 minutes cache
  async (req, res) => {
    // ... existing handler code
  }
);

// Get patient details with caching
router.get(
  '/:patientId',
  cacheMiddleware({ ttl: 300, keyPrefix: 'patient' }),
  async (req, res) => {
    // ... existing handler code
  }
);

// Update patient with cache invalidation
router.put('/:patientId', async (req, res) => {
  try {
    // ... existing update logic
    await invalidateCache.patientData(req.params.patientId);
    res.json({ /* response */ });
  } catch (error) {
    next(error);
  }
}); 