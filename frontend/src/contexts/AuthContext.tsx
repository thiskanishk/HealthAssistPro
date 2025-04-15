import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { User } from '../types';
import { apiService } from '../services/api/base';
import { loginStart, loginSuccess, loginFailure, logout, setUser } from '../store/slices/authSlice';

// Context type definition
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  specialization?: string;
  licenseNumber?: string;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | null>(null);

// Hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Props for the provider component
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const user = useSelector((state: any) => state.auth.user);
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);
  const error = useSelector((state: any) => state.auth.error);

  useEffect(() => {
    // Check if token exists and validate it
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Validate token and get user data
        const response = await apiService.get<User>('/auth/me');
        
        if (response.success && response.data) {
          dispatch(setUser(response.data)); // Pass the unwrapped data
          setIsLoading(false);
        } else {
          // Handle error case
          localStorage.removeItem('token');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth validation error:', error);
        localStorage.removeItem('token');
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, [dispatch]);

  const login = async (email: string, password: string) => {
    try {
      dispatch(loginStart());
      
      const response = await apiService.post<{ user: User; token: string }>('/auth/login', { 
        email, 
        password 
      });
      
      if (response.success && response.data) {
        dispatch(loginSuccess(response.data)); // Pass the unwrapped data
        navigate('/dashboard');
      } else {
        // Handle error case
        const errorMessage = response.error?.message || 'Login failed';
        dispatch(loginFailure(errorMessage));
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      dispatch(loginFailure(errorMessage));
    }
  };

  const logoutUser = () => {
    dispatch(logout());
    navigate('/login');
  };

  const register = async (userData: RegisterData) => {
    try {
      dispatch(loginStart());
      
      const response = await apiService.post<{ user: User; token: string }>('/auth/register', userData);
      
      if (response.success && response.data) {
        dispatch(loginSuccess(response.data)); // Pass the unwrapped data
        navigate('/dashboard');
      } else {
        // Handle error case
        const errorMessage = response.error?.message || 'Registration failed';
        dispatch(loginFailure(errorMessage));
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed';
      dispatch(loginFailure(errorMessage));
    }
  };

  const resetPassword = async (email: string) => {
    try {
      dispatch(loginStart());
      
      // Use apiService.post instead of non-existent resetPassword method
      await apiService.post('/auth/reset-password', { email });
      
      // Show success but don't login
      dispatch(loginFailure('Password reset link sent to your email'));
      navigate('/login');
    } catch (error: any) {
      const errorMessage = error.message || 'Password reset failed';
      dispatch(loginFailure(errorMessage));
    }
  };

  // Context value
  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    token: localStorage.getItem('token'),
    login,
    logout: logoutUser,
    register,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 