import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ApiResponse } from '../types';

// Define the local NotificationPreferences interface
export interface NotificationPreferences {
  enabled: boolean;
  emailNotifications: {
    enabled: boolean;
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  };
  pushNotifications: {
    enabled: boolean;
    sound: {
      enabled: boolean;
      volume: number;
    };
    vibration: boolean;
  };
  categories: {
    [key: string]: {
      enabled: boolean;
      priority: 'low' | 'medium' | 'high' | 'urgent';
    };
  };
  groups: Array<{
    name: string;
    enabled: boolean;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    sound: 'default' | 'alert' | 'reminder' | 'success' | 'error';
  }>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    allowUrgent: boolean;
  };
}

interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (newPreferences: Partial<NotificationPreferences>) => Promise<boolean>;
}

const defaultPreferences: NotificationPreferences = {
  enabled: true,
  emailNotifications: { enabled: true, frequency: 'immediate' },
  pushNotifications: { enabled: true, sound: { enabled: true, volume: 0.5 }, vibration: true },
  categories: {},
  groups: [],
  quietHours: { enabled: false, start: '', end: '', allowUrgent: false },
};

export const useNotificationPreferences = (): UseNotificationPreferencesReturn => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Load notification preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Here we would typically fetch from the API, but we'll simulate for now
        // const response = await apiService.getNotificationPreferences();
        
        // Simulate API response
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockResponse: ApiResponse<NotificationPreferences> = {
          success: true,
          data: {
            enabled: true,
            emailNotifications: { enabled: true, frequency: 'immediate' },
            pushNotifications: { enabled: true, sound: { enabled: true, volume: 0.5 }, vibration: true },
            categories: {},
            groups: [],
            quietHours: { enabled: false, start: '', end: '', allowUrgent: false },
          },
        };

        if (mockResponse.success && mockResponse.data) {
          setPreferences(mockResponse.data);
        }
      } catch (err) {
        setError('Failed to load notification preferences');
        console.error('Error loading notification preferences:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [isAuthenticated, user]);

  // Update notification preferences
  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      setError('You must be logged in to update preferences');
      return false;
    }

    try {
      setIsLoading(true);
      
      // Here we would typically send to the API, but we'll simulate for now
      // const response = await apiService.updateNotificationPreferences(newPreferences);
      
      // Simulate API response
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockResponse: ApiResponse<void> = {
        success: true,
      };

      if (mockResponse.success) {
        setPreferences((prev: NotificationPreferences) => ({ ...prev, ...newPreferences }));
        return true;
      } else {
        setError(mockResponse.error || 'Failed to update preferences');
        return false;
      }
    } catch (err) {
      setError('Failed to update notification preferences');
      console.error('Error updating notification preferences:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
  };
}; 