import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DiagnosisService {
  async getDiagnosis(patientId: string, diagnosisId: string) {
    return prisma.diagnosis.findFirst({
      where: {
        id: diagnosisId,
        patientId
      },
      include: {
        conditions: true,
        patient: true,
        doctor: true
      }
    });
  }

  async updateDiagnosis(patientId: string, diagnosisId: string, data: any) {
    return prisma.diagnosis.update({
      where: {
        id: diagnosisId,
        patientId
      },
      data,
      include: {
        conditions: true
      }
    });
  }

  async createDiagnosis(diagnosisData: any) {
    return prisma.diagnosis.create({
      data: {
        patientId: diagnosisData.patientId,
        symptoms: diagnosisData.symptoms,
        conditions: {
          create: diagnosisData.conditions || []
        },
        treatmentPlan: diagnosisData.treatmentPlan,
        aiConfidenceScore: diagnosisData.aiConfidenceScore,
        status: diagnosisData.status,
        doctorId: diagnosisData.doctorId
      },
      include: {
        conditions: true
      }
    });
  }
}
