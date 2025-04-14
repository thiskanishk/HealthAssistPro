declare module 'notifications' {
  export type NotificationType = 
    | 'appointment'
    | 'medication'
    | 'lab_result'
    | 'system'
    | 'chat'
    | 'telemedicine'
    | 'payment'
    | 'reminder'
    | 'prescription'
    | 'test_result'
    | 'message';

  export type NotificationCategory = 
    | 'medical'
    | 'administrative'
    | 'billing'
    | 'system'
    | 'communication'
    | 'urgent'
    | 'important'
    | 'info'
    | 'marketing';

  export type NotificationPriority = 'high' | 'medium' | 'low' | 'urgent';

  export interface NotificationSound {
    enabled: boolean;
    type?: string;
    volume: number;
    customSound?: string;
  }

  export interface NotificationData {
    [key: string]: any;
  }

  export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    priority: NotificationPriority;
    group?: string;
    sound?: NotificationSound;
    data?: NotificationData;
    read: boolean;
    readAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
  }

  export interface QuietHours {
    enabled: boolean;
    start: string; // Format: "HH:mm"
    end: string; // Format: "HH:mm"
    days: number[]; // 0-6, where 0 is Sunday
    allowUrgent?: boolean;
  }

  export interface CategoryPreferences {
    enabled: boolean;
    priority?: NotificationPriority;
    sound?: NotificationSound;
  }

  export interface NotificationGroup {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    priority?: NotificationPriority;
    sound?: string;
    members: string[];
    createdAt: Date;
    updatedAt: Date;
  }

  export interface NotificationPreferences {
    userId: string;
    enabled: boolean;
    soundEnabled: boolean;
    volume: number;
    categories: {
      [key in NotificationCategory]: CategoryPreferences;
    };
    types: {
      [key in NotificationType]: boolean;
    };
    groups: {
      [key: string]: {
        enabled: boolean;
        priority?: NotificationPriority;
        sound?: string;
      };
    };
    quietHours: QuietHours;
    updatedAt?: Date;
  }

  export interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    preferences: NotificationPreferences;
    loading: boolean;
    error: Error | null;
  }

  export interface NotificationContextType {
    state: NotificationState;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
    updateCategoryPreferences: (category: NotificationCategory, preferences: Partial<CategoryPreferences>) => Promise<void>;
    updateQuietHours: (quietHours: Partial<QuietHours>) => Promise<void>;
    clearNotifications: () => Promise<void>;
    dismissNotification: (notificationId: string) => Promise<void>;
    fetchNotifications: () => Promise<void>;
    fetchPreferences: () => Promise<void>;
  }
} 