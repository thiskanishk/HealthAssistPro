import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ApiResponse } from '../types';

// Types for the hook
export interface Appointment {
  _id: string;
  patientId: string;
  doctorId: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  meetingLink?: string;
}

export interface TelemedicineSession {
  appointmentId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  participants: {
    id: string;
    role: 'doctor' | 'patient';
    name: string;
    joinedAt: Date;
    leftAt?: Date;
  }[];
  status: 'waiting' | 'active' | 'ended';
}

export interface ConsultationNote {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VitalReading {
  type: 'heartRate' | 'bloodPressure' | 'temperature' | 'oxygenSaturation';
  value: number | string;
  unit: string;
  timestamp: Date;
}

export interface TelemedicineState {
  currentAppointment: Appointment | null;
  appointments: Appointment[];
  consultationNotes: ConsultationNote[];
  vitals: VitalReading[];
  isLoading: boolean;
  error: string | null;
}

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Hook implementation
export const useTelemedicine = () => {
  const { user, token } = useAuth();
  const [state, setState] = useState<TelemedicineState>({
    currentAppointment: null,
    appointments: [],
    consultationNotes: [],
    vitals: [],
    isLoading: false,
    error: null
  });

  // Set error with auto-clear after 5 seconds
  const setError = (error: string) => {
    setState(prev => ({ ...prev, error }));
    setTimeout(() => {
      setState(prev => ({ ...prev, error: null }));
    }, 5000);
  };

  // Get current appointment
  const fetchCurrentAppointment = useCallback(async () => {
    if (!user?.id || !token) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await fetch(`${API_URL}/telemedicine/current-appointment/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch appointment');
      }
      
      const data = await response.json();
      setState(prev => ({ 
        ...prev, 
        currentAppointment: data.appointment || null,
        isLoading: false
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id, token]);

  // Get upcoming appointments
  const fetchAppointments = useCallback(async (date?: string) => {
    if (!user?.id || !token) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const url = date 
        ? `${API_URL}/telemedicine/appointments?date=${date}&userId=${user.id}`
        : `${API_URL}/telemedicine/appointments?userId=${user.id}`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      
      const data = await response.json();
      setState(prev => ({ 
        ...prev, 
        appointments: data.appointments || [],
        isLoading: false
      }));
      
      return data.appointments;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setState(prev => ({ ...prev, isLoading: false }));
      return [];
    }
  }, [user?.id, token]);

  // Get consultation notes
  const fetchConsultationNotes = useCallback(async (appointmentId: string) => {
    if (!token) return [];
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await fetch(`${API_URL}/telemedicine/notes/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      
      const data = await response.json();
      const notes = data.notes || [];
      setState(prev => ({ 
        ...prev, 
        consultationNotes: notes,
        isLoading: false
      }));
      
      return notes;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setState(prev => ({ ...prev, isLoading: false }));
      return [];
    }
  }, [token]);

  // Save consultation notes
  const saveConsultationNotes = useCallback(async (appointmentId: string, content: string) => {
    if (!user?.id || !token) return null;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await fetch(`${API_URL}/telemedicine/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentId,
          patientId: user.role === 'doctor' ? state.currentAppointment?.patientId : user.id,
          doctorId: user.role === 'doctor' ? user.id : state.currentAppointment?.doctorId,
          content
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save notes');
      }
      
      const data = await response.json();
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
      
      await fetchConsultationNotes(appointmentId);
      return data.note;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setState(prev => ({ ...prev, isLoading: false }));
      return null;
    }
  }, [user, token, state.currentAppointment, fetchConsultationNotes]);

  // Record vitals
  const recordVitals = useCallback(async (
    appointmentId: string, 
    vitals: { type: string; value: number | string; unit: string }[]
  ) => {
    if (!user?.id || !token) return false;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await fetch(`${API_URL}/telemedicine/vitals`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentId,
          patientId: user.role === 'doctor' ? state.currentAppointment?.patientId : user.id,
          vitals
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to record vitals');
      }
      
      const data = await response.json();
      
      // Update local state with new vitals
      const newVitals = vitals.map(v => ({
        ...v,
        timestamp: new Date()
      })) as VitalReading[];
      
      setState(prev => ({
        ...prev,
        vitals: [...prev.vitals, ...newVitals],
        isLoading: false
      }));
      
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user, token, state.currentAppointment]);

  // Join a telemedicine session
  const joinSession = useCallback(async (appointmentId: string) => {
    if (!user?.id || !token) return null;
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const response = await fetch(`${API_URL}/telemedicine/join-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentId,
          userId: user.id,
          userRole: user.role
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to join session');
      }
      
      const data = await response.json();
      setState(prev => ({ ...prev, isLoading: false }));
      
      return data.session;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setState(prev => ({ ...prev, isLoading: false }));
      return null;
    }
  }, [user, token]);

  // Load initial data
  useEffect(() => {
    if (user?.id && token) {
      fetchCurrentAppointment();
      fetchAppointments();
    }
  }, [user?.id, token, fetchCurrentAppointment, fetchAppointments]);

  return {
    ...state,
    fetchCurrentAppointment,
    fetchAppointments,
    fetchConsultationNotes,
    saveConsultationNotes,
    recordVitals,
    joinSession
  };
};

export default useTelemedicine; 