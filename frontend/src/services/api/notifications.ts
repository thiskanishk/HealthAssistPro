import { ApiResponse } from '../../types';
import { ApiService } from './base';

// Define the Notification type
export interface Notification {
    id: string;
    type: 'medication' | 'appointment' | 'lab' | 'general';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    priority: 'high' | 'medium' | 'low';
}

// For development/testing, use mock data
const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'medication',
        title: 'Medication Reminder',
        message: 'Time to take your Lisinopril medication',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'high'
    },
    {
        id: '2',
        type: 'appointment',
        title: 'Upcoming Appointment',
        message: 'You have an appointment with Dr. Johnson tomorrow at 10:00 AM',
        timestamp: new Date(Date.now() - 60000 * 60).toISOString(),
        read: true,
        priority: 'medium'
    },
    {
        id: '3',
        type: 'lab',
        title: 'Lab Results Available',
        message: 'Your recent blood work results are now available',
        timestamp: new Date(Date.now() - 60000 * 60 * 24).toISOString(),
        read: false,
        priority: 'medium'
    }
];

/**
 * Fetches user notifications from the API
 * @returns Array of notifications
 */
export const getNotifications = async (): Promise<Notification[]> => {
    // In a real implementation, this would call the API
    // return await ApiService.getInstance().get<Notification[]>('/notifications');
    
    // For now, return mock data
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return mockNotifications;
};

/**
 * Marks a notification as read
 * @param id ID of the notification to mark as read
 */
export const markNotificationRead = async (id: string): Promise<void> => {
    // In a real implementation, this would call the API
    // return await ApiService.getInstance().post<void>(`/notifications/${id}/read`);
    
    // For now, update mock data
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    const notification = mockNotifications.find(n => n.id === id);
    if (notification) {
        notification.read = true;
    }
};

/**
 * Updates notification preferences
 * @param preferences User notification preferences
 */
export const updateNotificationPreferences = async (
    preferences: Record<string, boolean>
): Promise<ApiResponse<void>> => {
    // In a real implementation, this would call the API
    // return await ApiService.getInstance().post<void>('/notifications/preferences', preferences);
    
    // For now, simulate success
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    return { success: true };
}; 