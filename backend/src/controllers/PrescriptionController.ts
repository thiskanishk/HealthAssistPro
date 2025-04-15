import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration?: number;
  notes?: string;
}

class PrescriptionController {
  async getPrescriptions(req: Request, res: Response): Promise<Response> {
    try {
      const { patientId } = req.query;

      if (!patientId || typeof patientId !== 'string') {
        return res.status(400).json({ error: 'Patient ID is required' });
      }

      const prescriptions = await prisma.prescription.findMany({
        where: {
          patientId: patientId,
        },
        include: {
          medications: true,
        },
      });

      return res.json(prescriptions);
    } catch (error) {
      console.error('Error getting prescriptions:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createPrescription(req: Request, res: Response): Promise<Response> {
    try {
      const { patientId, medications } = req.body;
      const doctorId = (req.user as { id: string })?.id;

      if (!doctorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!Array.isArray(medications)) {
        return res.status(400).json({ error: 'Medications must be an array' });
      }

      const prescription = await prisma.prescription.create({
        data: {
          patientId: String(patientId),
          doctorId,
          medications: {
            create: medications.map((med: Medication) => ({
              name: med.name,
              dosage: med.dosage,
              frequency: med.frequency,
              duration: med.duration,
              notes: med.notes,
            })),
          },
        },
        include: {
          medications: true,
        },
      });

      return res.status(201).json(prescription);
    } catch (error) {
      console.error('Error creating prescription:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Export a singleton instance
export default new PrescriptionController();
