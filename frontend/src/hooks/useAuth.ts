import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, AuthState } from '../types';
import { apiService } from '../services/api';

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
    setAuthState(prev => ({ ...prev, error }));
    // Clear error after 5 seconds
    setTimeout(() => {
      setAuthState(prev => ({ ...prev, error: null }));
    }, 5000);
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
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
      setAuthState(prev => ({ ...prev, isLoading: false }));
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
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await apiService.register(userData);
      
      if (response.success && response.data) {
        navigate('/auth/login');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Registration failed');
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, [navigate]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await apiService.resetPassword(email);
      
      if (response.success) {
        navigate('/auth/login');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Password reset failed');
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, [navigate]);

  // Check auth status on mount and token change
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const response = await apiService.api.get('/auth/validate');
        if (response.data.user) {
          setAuthState({
            user: response.data.user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        logout();
      }
    };

    validateToken();
  }, [logout]);

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