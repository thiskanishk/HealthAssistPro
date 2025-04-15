import { Request, Response } from 'express';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration?: number;
  notes?: string;
}

declare class PrescriptionController {
  getPrescriptions(req: Request, res: Response): Promise<Response>;
  createPrescription(req: Request, res: Response): Promise<Response>;
}

declare const prescriptionController: PrescriptionController;
export default prescriptionController;
