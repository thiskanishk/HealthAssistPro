import { axiosInstance } from './axios';

export interface DiagnosisInput {
    patientId: string;
    symptoms: string[];
    diagnosis: string;
    severity: string;
    treatment: string;
    notes?: string;
}

export const createDiagnosis = async (data: DiagnosisInput) => {
    const response = await axiosInstance.post('/diagnosis', data);
    return response.data;
};

export const getDiagnosis = async (id: string) => {
    const response = await axiosInstance.get(`/diagnosis/${id}`);
    return response.data;
};

export const getPatientDiagnoses = async (patientId: string) => {
    const response = await axiosInstance.get(`/diagnosis/patient/${patientId}`);
    return response.data;
}; 