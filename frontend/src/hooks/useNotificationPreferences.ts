import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';

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

export const useNotificationPreferences = () => {
  const { token } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notification-preferences', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreferences(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch notification preferences');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    try {
      setLoading(true);
      const response = await axios.patch('/api/notification-preferences', updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreferences(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      setError('Failed to update notification preferences');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateQuietHours = useCallback(async (quietHours: NotificationPreferences['quietHours']) => {
    try {
      setLoading(true);
      const response = await axios.patch('/api/notification-preferences/quiet-hours', quietHours, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreferences(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      setError('Failed to update quiet hours');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateCategory = useCallback(async (
    category: string,
    enabled: boolean,
    priority: 'low' | 'medium' | 'high' | 'urgent'
  ) => {
    try {
      setLoading(true);
      const response = await axios.patch('/api/notification-preferences/categories', {
        category,
        enabled,
        priority
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreferences(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      setError('Failed to update category preferences');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createGroup = useCallback(async (group: Omit<NotificationPreferences['groups'][0], '_id'>) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/notification-preferences/groups', group, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreferences(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      setError('Failed to create notification group');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateGroup = useCallback(async (groupName: string, updates: Partial<NotificationPreferences['groups'][0]>) => {
    try {
      setLoading(true);
      const response = await axios.patch('/api/notification-preferences/groups', {
        groupName,
        updates
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreferences(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      setError('Failed to update notification group');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const deleteGroup = useCallback(async (groupName: string) => {
    try {
      setLoading(true);
      const response = await axios.delete(`/api/notification-preferences/groups/${groupName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreferences(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      setError('Failed to delete notification group');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    updateQuietHours,
    updateCategory,
    createGroup,
    updateGroup,
    deleteGroup,
    refetch: fetchPreferences
  };
}; 