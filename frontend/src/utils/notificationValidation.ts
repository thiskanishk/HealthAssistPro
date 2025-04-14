import { z } from 'zod';
import type {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationSound,
  Notification,
  QuietHours,
  CategoryPreferences,
  NotificationPreferences,
  NotificationDeliveryStatus,
  NotificationMetrics
} from '../types/notifications';

// Custom error class
export class NotificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

// Base schemas with custom error messages
export const notificationTypeSchema = z.enum([
  'appointment',
  'medication',
  'lab_result',
  'system',
  'chat',
  'telemedicine',
  'payment',
  'reminder',
  'prescription',
  'test_result',
  'message'
], {
  errorMap: () => ({ message: 'Invalid notification type' })
});

export const notificationCategorySchema = z.enum([
  'medical',
  'administrative',
  'billing',
  'system',
  'communication',
  'urgent',
  'important',
  'info',
  'marketing'
], {
  errorMap: () => ({ message: 'Invalid notification category' })
});

export const notificationPrioritySchema = z.enum([
  'high',
  'medium',
  'low',
  'urgent'
], {
  errorMap: () => ({ message: 'Invalid priority level' })
});

export const notificationDeliveryStatusSchema = z.enum([
  'pending',
  'delivered',
  'failed',
  'expired',
  'blocked'
], {
  errorMap: () => ({ message: 'Invalid delivery status' })
});

// Complex schemas with validation rules
export const notificationSoundSchema = z.object({
  enabled: z.boolean(),
  type: z.string().optional(),
  volume: z.number().min(0, "Volume must be between 0 and 1").max(1, "Volume must be between 0 and 1"),
  customSound: z.string().url("Invalid sound URL").optional()
});

export const quietHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (use HH:mm)"),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (use HH:mm)"),
  days: z.array(z.number().min(0, "Day must be between 0 and 6").max(6, "Day must be between 0 and 6")),
  allowUrgent: z.boolean().optional(),
  allowedCategories: z.array(notificationCategorySchema).optional()
});

export const categoryPreferencesSchema = z.object({
  enabled: z.boolean(),
  priority: notificationPrioritySchema.optional(),
  sound: notificationSoundSchema.optional(),
  autoExpire: z.number().min(0, "Auto-expire duration must be positive").optional(),
  batchNotifications: z.boolean().optional(),
  batchInterval: z.number().min(1, "Batch interval must be at least 1 minute").optional()
});

export const notificationSchema = z.object({
  id: z.string().min(1, "ID is required").regex(/^[a-zA-Z0-9-]+$/, "Invalid ID format"),
  userId: z.string().min(1, "User ID is required"),
  type: notificationTypeSchema,
  category: notificationCategorySchema,
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  message: z.string().min(1, "Message is required").max(500, "Message too long"),
  priority: notificationPrioritySchema,
  group: z.string().optional(),
  sound: notificationSoundSchema.optional(),
  data: z.record(z.unknown()).optional(),
  read: z.boolean(),
  readAt: z.date().optional(),
  expiresAt: z.date().optional(),
  createdAt: z.date(),
  actionUrl: z.string().url("Invalid action URL").optional(),
  iconUrl: z.string().url("Invalid icon URL").optional(),
  dismissible: z.boolean().optional(),
  tags: z.array(z.string()).max(10, "Too many tags").optional()
});

export const notificationPreferencesSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  enabled: z.boolean(),
  soundEnabled: z.boolean(),
  volume: z.number().min(0, "Volume must be between 0 and 1").max(1, "Volume must be between 0 and 1"),
  categories: z.record(categoryPreferencesSchema),
  types: z.record(z.boolean()),
  groups: z.record(z.object({
    enabled: z.boolean(),
    priority: notificationPrioritySchema.optional(),
    sound: z.string().optional()
  })),
  quietHours: quietHoursSchema,
  updatedAt: z.date().optional(),
  showWhenOffline: z.boolean().optional(),
  maxUnread: z.number().min(0, "Max unread must be positive").optional(),
  autoDismissRead: z.number().min(0, "Auto-dismiss duration must be positive").optional(),
  displayDuration: z.number().min(0, "Display duration must be positive").optional()
});

export const notificationMetricsSchema = z.object({
  totalSent: z.number().min(0),
  totalDelivered: z.number().min(0),
  totalFailed: z.number().min(0),
  avgDeliveryTime: z.number().min(0),
  byCategory: z.record(z.number().min(0)),
  byPriority: z.record(z.number().min(0)),
  readRate: z.number().min(0).max(100),
  interactionRate: z.number().min(0).max(100)
});

// Safe validation functions that return Result types
export const safeValidateNotification = (data: unknown) => {
  const result = notificationSchema.safeParse(data);
  if (!result.success) {
    throw new NotificationError(
      'Invalid notification data',
      'VALIDATION_ERROR',
      400,
      { errors: result.error.errors }
    );
  }
  return result.data;
};

export const safeValidatePreferences = (data: unknown) => {
  const result = notificationPreferencesSchema.safeParse(data);
  if (!result.success) {
    throw new NotificationError(
      'Invalid preferences data',
      'VALIDATION_ERROR',
      400,
      { errors: result.error.errors }
    );
  }
  return result.data;
};

// Helper functions with error handling
export const validateTimeFormat = (time: string): boolean => {
  try {
    return quietHoursSchema.shape.start.safeParse(time).success;
  } catch {
    return false;
  }
};

export const validateDayOfWeek = (day: number): boolean => {
  try {
    return quietHoursSchema.shape.days.element.safeParse(day).success;
  } catch {
    return false;
  }
};

export const validateVolume = (volume: number): boolean => {
  try {
    return notificationSoundSchema.shape.volume.safeParse(volume).success;
  } catch {
    return false;
  }
};

// Type guards with error context
export const isNotificationType = (value: unknown): value is NotificationType => {
  return notificationTypeSchema.safeParse(value).success;
};

export const isNotificationCategory = (value: unknown): value is NotificationCategory => {
  return notificationCategorySchema.safeParse(value).success;
};

export const isNotificationPriority = (value: unknown): value is NotificationPriority => {
  return notificationPrioritySchema.safeParse(value).success;
};

// Utility functions for common operations
export const createNotification = (data: Partial<Notification>): Notification => {
  const defaultNotification: Partial<Notification> = {
    read: false,
    createdAt: new Date(),
    dismissible: true
  };
  
  return safeValidateNotification({
    ...defaultNotification,
    ...data
  });
};

export const updateNotificationPreferences = (
  current: NotificationPreferences,
  updates: Partial<NotificationPreferences>
): NotificationPreferences => {
  return safeValidatePreferences({
    ...current,
    ...updates,
    updatedAt: new Date()
  });
};

// Error handling utilities
export const handleValidationError = (error: unknown): NotificationError => {
  if (error instanceof z.ZodError) {
    return new NotificationError(
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      { errors: error.errors }
    );
  }
  if (error instanceof NotificationError) {
    return error;
  }
  return new NotificationError(
    'Unknown error occurred',
    'UNKNOWN_ERROR',
    500
  );
}; 