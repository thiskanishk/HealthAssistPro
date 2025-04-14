import { Router } from 'express';
import { DiagnosisController } from '../controllers/DiagnosisController';
import { validate } from '../middleware/validation';
import { diagnosisValidation } from '../validators/diagnosisValidation';
import { authorize } from '../middleware/auth';

const router = Router();
const diagnosisController = new DiagnosisController();

/**
 * @swagger
 * /api/diagnosis:
 *   post:
 *     summary: Create 