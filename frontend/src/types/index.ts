export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'doctor' | 'nurse' | 'patient';
  specialization?: string;
  licenseNumber?: string;
  lastLogin?: Date;
  isActive: boolean;
}

export interface Patient {
  id: string;
  userId: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies: string[];
  chronicConditions: string[];
  medications: Medication[];
  emergencyContact: EmergencyContact;
  healthMetrics: HealthMetrics;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  prescribedBy: string;
  notes?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface HealthMetrics {
  height?: number;
  weight?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  bloodSugar?: number;
  temperature?: number;
  oxygenSaturation?: number;
  lastUpdated: Date;
}

export interface Diagnosis {
  id: string;
  patientId: string;
  doctorId: string;
  symptoms: string[];
  diagnosis: string;
  severity: 'low' | 'medium' | 'high';
  aiSuggestion?: string;
  confidence?: number;
  treatment: Treatment;
  createdAt: Date;
  updatedAt: Date;
}

export interface Treatment {
  medications: Medication[];
  instructions: string;
  followUpDate?: Date;
  restrictions?: string[];
  duration: number;
  notes?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  dateTime: Date;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  type: 'regular' | 'follow-up' | 'emergency';
  notes?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ThemeConfig {
  mode: 'light' | 'dark';
  primary: string;
  secondary: string;
  fontSize: 'small' | 'medium' | 'large';
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  appointmentReminders: boolean;
  medicationReminders: boolean;
  labResults: boolean;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
} 