import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, AuthState } from '../types';
import { apiService } from '../services/api';
import axios from 'axios';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Partial<User>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const setError = (error: string) => {
    setAuthState((prev: AuthState) => ({ ...prev, error }));
    // Clear error after 5 seconds
    setTimeout(() => {
      setAuthState((prev: AuthState) => ({ ...prev, error: null }));
    }, 5000);
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState((prev: AuthState) => ({ ...prev, isLoading: true, error: null }));
      const response = await apiService.login(email, password);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        localStorage.setItem('token', token);
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        // Redirect based on user role
        switch (user.role) {
          case 'admin':
            navigate('/admin/dashboard');
            break;
          case 'doctor':
            navigate('/doctor/dashboard');
            break;
          case 'nurse':
            navigate('/nurse/dashboard');
            break;
          case 'patient':
            navigate('/patient/dashboard');
            break;
          default:
            navigate('/dashboard');
        }
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Login failed');
      setAuthState((prev: AuthState) => ({ ...prev, isLoading: false }));
    }
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    navigate('/auth/login');
  }, [navigate]);

  const register = useCallback(async (userData: Partial<User>) => {
    try {
      setAuthState((prev: AuthState) => ({ ...prev, isLoading: true, error: null }));
      const response = await apiService.register(userData);
      
      if (response.success && response.data) {
        navigate('/auth/login');
      } else if (response.error) {
        setError(response.error.message || 'Registration failed');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Registration failed');
    } finally {
      setAuthState((prev: AuthState) => ({ ...prev, isLoading: false }));
    }
  }, [navigate]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      setAuthState((prev: AuthState) => ({ ...prev, isLoading: true, error: null }));
      const response = await apiService.resetPassword(email);
      
      if (response.success) {
        navigate('/auth/login');
      } else if (response.error) {
        setError(response.error.message || 'Password reset failed');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Password reset failed');
    } finally {
      setAuthState((prev: AuthState) => ({ ...prev, isLoading: false }));
    }
  }, [navigate]);

  // Check auth status on mount
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthState((prev: AuthState) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        setAuthState((prev: AuthState) => ({ ...prev, isLoading: true }));
        
        // Make a direct axios call since we don't have a dedicated method in apiService
        const baseURL = process.env.REACT_APP_API_URL || '/api';
        const response = await axios.get(`${baseURL}/auth/validate`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data && response.data.user) {
          setAuthState({
            user: response.data.user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          // Token is invalid or user data missing
          localStorage.removeItem('token');
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        // Clear token on error
        localStorage.removeItem('token');
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Session expired. Please login again.',
        });
      }
    };

    validateToken();
  }, []); // Empty dependency array to run only on mount

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    login,
    logout,
    register,
    resetPassword,
  };
}; 