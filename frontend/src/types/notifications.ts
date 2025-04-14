/** Represents the different types of notifications supported by the system */
export type NotificationType = 
  | 'appointment'    // Medical appointment notifications
  | 'medication'     // Medication reminders
  | 'lab_result'     // Laboratory test results
  | 'system'         // System-level notifications
  | 'chat'          // Chat messages
  | 'telemedicine'   // Telemedicine session notifications
  | 'payment'        // Payment and billing notifications
  | 'reminder'       // General reminders
  | 'prescription'   // Prescription-related notifications
  | 'test_result'    // General test results
  | 'message';       // General messages

/** Categories for organizing and filtering notifications */
export type NotificationCategory =
  | 'medical'        // Medical-related notifications
  | 'administrative' // Administrative notifications
  | 'billing'        // Billing and payment notifications
  | 'system'         // System notifications
  | 'communication'  // Communication-related notifications
  | 'urgent'         // Time-sensitive notifications
  | 'important'      // High-priority notifications
  | 'info'           // Informational notifications
  | 'marketing';     // Marketing and promotional notifications

/** Priority levels for notifications */
export type NotificationPriority = 'high' | 'medium' | 'low' | 'urgent';

/** Configuration for notification sounds */
export interface NotificationSound {
  /** Whether sound is enabled for this notification */
  enabled: boolean;
  /** Type of sound to play (default, custom, etc.) */
  type?: string;
  /** Volume level (0-1) */
  volume: number;
  /** Custom sound file path */
  customSound?: string;
}

/** Additional data attached to notifications */
export interface NotificationData {
  [key: string]: unknown;
}

/** Core notification object structure */
export interface Notification {
  /** Unique identifier for the notification */
  id: string;
  /** ID of the user this notification is for */
  userId: string;
  /** Type of notification */
  type: NotificationType;
  /** Category for filtering and organization */
  category: NotificationCategory;
  /** Short notification title */
  title: string;
  /** Detailed notification message */
  message: string;
  /** Priority level */
  priority: NotificationPriority;
  /** Optional group identifier */
  group?: string;
  /** Sound configuration */
  sound?: NotificationSound;
  /** Additional data */
  data?: NotificationData;
  /** Whether the notification has been read */
  read: boolean;
  /** When the notification was read */
  readAt?: Date;
  /** When the notification expires */
  expiresAt?: Date;
  /** When the notification was created */
  createdAt: Date;
  /** Action URL if applicable */
  actionUrl?: string;
  /** Icon URL if applicable */
  iconUrl?: string;
  /** Whether the notification can be dismissed */
  dismissible?: boolean;
  /** Tags for additional categorization */
  tags?: string[];
}

/** Quiet hours configuration */
export interface QuietHours {
  /** Whether quiet hours are enabled */
  enabled: boolean;
  /** Start time in HH:mm format */
  start: string;
  /** End time in HH:mm format */
  end: string;
  /** Days of week (0-6, Sunday is 0) */
  days: number[];
  /** Whether to allow urgent notifications during quiet hours */
  allowUrgent?: boolean;
  /** Specific categories to allow during quiet hours */
  allowedCategories?: NotificationCategory[];
}

/** Category-specific preferences */
export interface CategoryPreferences {
  /** Whether notifications in this category are enabled */
  enabled: boolean;
  /** Override priority for this category */
  priority?: NotificationPriority;
  /** Override sound settings for this category */
  sound?: NotificationSound;
  /** Auto-expire duration in minutes */
  autoExpire?: number;
  /** Whether to batch notifications in this category */
  batchNotifications?: boolean;
  /** Batch delivery interval in minutes */
  batchInterval?: number;
}

/** Group configuration */
export interface NotificationGroup {
  /** Unique identifier for the group */
  id: string;
  /** Display name of the group */
  name: string;
  /** Optional description */
  description?: string;
  /** Whether the group is enabled */
  enabled: boolean;
  /** Override priority for this group */
  priority?: NotificationPriority;
  /** Override sound settings for this group */
  sound?: string;
  /** Member user IDs */
  members: string[];
  /** When the group was created */
  createdAt: Date;
  /** When the group was last updated */
  updatedAt: Date;
  /** Group icon URL */
  iconUrl?: string;
  /** Group color for UI */
  color?: string;
}

/** User notification preferences */
export interface NotificationPreferences {
  /** User ID these preferences belong to */
  userId: string;
  /** Whether notifications are enabled globally */
  enabled: boolean;
  /** Whether sound is enabled globally */
  soundEnabled: boolean;
  /** Global volume setting */
  volume: number;
  /** Per-category preferences */
  categories: {
    [key in NotificationCategory]: CategoryPreferences;
  };
  /** Per-type enabled states */
  types: {
    [key in NotificationType]: boolean;
  };
  /** Group configurations */
  groups: {
    [key: string]: {
      enabled: boolean;
      priority?: NotificationPriority;
      sound?: string;
    };
  };
  /** Quiet hours settings */
  quietHours: QuietHours;
  /** Last update timestamp */
  updatedAt?: Date;
  /** Whether to show notifications when offline */
  showWhenOffline?: boolean;
  /** Maximum number of unread notifications */
  maxUnread?: number;
  /** Auto-dismiss read notifications after X minutes */
  autoDismissRead?: number;
  /** Default notification display duration */
  displayDuration?: number;
}

/** Notification delivery status */
export type NotificationDeliveryStatus = 
  | 'pending'    // Waiting to be delivered
  | 'delivered'  // Successfully delivered
  | 'failed'     // Delivery failed
  | 'expired'    // Expired before delivery
  | 'blocked';   // Blocked by preferences

/** Notification metrics for monitoring */
export interface NotificationMetrics {
  /** Total notifications sent */
  totalSent: number;
  /** Total notifications delivered */
  totalDelivered: number;
  /** Total notifications failed */
  totalFailed: number;
  /** Average delivery time in ms */
  avgDeliveryTime: number;
  /** Notifications by category */
  byCategory: Record<NotificationCategory, number>;
  /** Notifications by priority */
  byPriority: Record<NotificationPriority, number>;
  /** Read rate percentage */
  readRate: number;
  /** Interaction rate percentage */
  interactionRate: number;
}

/**
 * Notification context for React components
 */
export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  loading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  updateCategoryPreferences: (category: NotificationCategory, preferences: Partial<CategoryPreferences>) => Promise<void>;
  updateQuietHours: (quietHours: Partial<QuietHours>) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
} 