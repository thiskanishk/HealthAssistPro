import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../services/logger';
import { Patient } from '../models/Patient';

export class PatientController {
  async getPatient(req: Request, res: Response, next: NextFunction) {
    try {
      const patient = await Patient.findById(req.params.id);
      
      if (!patient) {
        throw AppError.notFound('Patient not found');
      }

      logger.info('Patient retrieved', {
        patientId: patient.id,
        userId: req.user.id
      });

      res.json({
        status: 'success',
        data: patient
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePatient(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const patient = await Patient.findById(id);
      
      if (!patient) {
        throw AppError.notFound('Patient not found');
      }

      // Validate access
      if (!patient.canBeModifiedBy(req.user)) {
        throw AppError.forbidden('You do not have permission to modify this patient');
      }

      const updatedPatient = await Patient.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true
      });

      logger.info('Patient updated', {
        patientId: id,
        userId: req.user.id,
        updates: Object.keys(updates)
      });

      res.json({
        status: 'success',
        data: updatedPatient
      });
    } catch (error) {
      next(error);
    }
  }
} 