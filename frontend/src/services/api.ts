import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  User, 
  Patient, 
  Diagnosis, 
  Appointment, 
  ApiResponse, 
  PaginatedResponse 
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private static instance: ApiService;

  private constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Handle token refresh or logout
          localStorage.removeItem('token');
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }
    );
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async register(userData: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async resetPassword(email: string): Promise<ApiResponse<void>> {
    const response = await this.api.post('/auth/reset-password', { email });
    return response.data;
  }

  // Add validateToken method for auth context
  async validateToken(token: string): Promise<ApiResponse<{ user: User }>> {
    try {
      const response = await this.api.get('/auth/validate', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Invalid token',
      };
    }
  }

  // Patient endpoints
  async getPatients(page = 1, limit = 10): Promise<PaginatedResponse<Patient>> {
    const response = await this.api.get(`/patients?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getPatientById(id: string): Promise<ApiResponse<Patient>> {
    const response = await this.api.get(`/patients/${id}`);
    return response.data;
  }

  async createPatient(patientData: Partial<Patient>): Promise<ApiResponse<Patient>> {
    const response = await this.api.post('/patients', patientData);
    return response.data;
  }

  async updatePatient(id: string, patientData: Partial<Patient>): Promise<ApiResponse<Patient>> {
    const response = await this.api.put(`/patients/${id}`, patientData);
    return response.data;
  }

  // Diagnosis endpoints
  async createDiagnosis(diagnosisData: Partial<Diagnosis>): Promise<ApiResponse<Diagnosis>> {
    const response = await this.api.post('/diagnosis', diagnosisData);
    return response.data;
  }

  async getDiagnosisHistory(patientId: string): Promise<ApiResponse<Diagnosis[]>> {
    const response = await this.api.get(`/diagnosis/patient/${patientId}`);
    return response.data;
  }

  async getAISuggestion(symptoms: string[]): Promise<ApiResponse<{ suggestion: string; confidence: number }>> {
    const response = await this.api.post('/diagnosis/ai-suggestion', { symptoms });
    return response.data;
  }

  // Appointment endpoints
  async getAppointments(filters: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<ApiResponse<Appointment[]>> {
    const response = await this.api.get('/appointments', { params: filters });
    return response.data;
  }

  async scheduleAppointment(appointmentData: Partial<Appointment>): Promise<ApiResponse<Appointment>> {
    const response = await this.api.post('/appointments', appointmentData);
    return response.data;
  }

  async updateAppointment(id: string, status: string): Promise<ApiResponse<Appointment>> {
    const response = await this.api.patch(`/appointments/${id}`, { status });
    return response.data;
  }

  // User profile endpoints
  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.api.put('/users/profile', userData);
    return response.data;
  }

  async updateNotificationPreferences(preferences: Record<string, boolean>): Promise<ApiResponse<void>> {
    const response = await this.api.put('/users/notifications', preferences);
    return response.data;
  }

  // Error handling wrapper
  private async handleRequest<T>(request: Promise<AxiosResponse>): Promise<ApiResponse<T>> {
    try {
      const response = await request;
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'An unexpected error occurred',
      };
    }
  }
}

export const apiService = ApiService.getInstance(); 