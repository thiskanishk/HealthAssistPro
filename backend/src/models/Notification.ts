import mongoose, { Document, Schema, Model, CallbackError } from 'mongoose';
import { Types } from 'mongoose';

/**
 * Represents the types of notifications that can be sent in the system
 * @enum {string}
 */
export type NotificationType = 
    | 'task_assignment'
    | 'task_update'
    | 'deadline_reminder'
    | 'workload_alert'
    | 'department_announcement'
    | 'emergency_alert'
    | 'system_update'
    | 'appointment_reminder'
    | 'test_results'
    | 'medication_reminder';

/**
 * Represents the categories that notifications can be grouped into
 * @enum {string}
 */
export type NotificationCategory = 
    | 'tasks'
    | 'appointments'
    | 'system'
    | 'alerts'
    | 'reminders'
    | 'medical';

/**
 * Represents the priority levels for notifications
 * @enum {string}
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Represents the available sound types for notifications
 * @enum {string}
 */
export type NotificationSoundType = 'default' | 'alert' | 'reminder' | 'success' | 'error';

/**
 * Branded type for volume validation
 */
type ValidVolume = number & { readonly _brand: unique symbol };

/**
 * Type guard for volume validation
 */
function isValidVolume(volume: number): volume is ValidVolume {
    return volume >= 0 && volume <= 1;
}

/**
 * Interface for notification sound settings
 * @interface INotificationSound
 */
interface INotificationSound {
    type: NotificationSoundType;
    volume: ValidVolume;
}

/**
 * Interface for structured notification data
 * Extends based on notification type
 */
interface INotificationData {
    taskAssignment?: {
        taskId: Types.ObjectId;
        dueDate: Date;
        priority: string;
    };
    appointment?: {
        appointmentId: Types.ObjectId;
        dateTime: Date;
        location: string;
    };
    medicalAlert?: {
        patientId: Types.ObjectId;
        condition: string;
        severity: string;
    };
    [key: string]: unknown;
}

/**
 * Represents a notification document in MongoDB
 * @interface INotification
 * @extends {Document}
 */
export interface INotification extends Document {
    userId: Types.ObjectId;
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    priority: NotificationPriority;
    group: string;
    sound?: INotificationSound;
    data?: INotificationData;
    read: boolean;
    readAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    
    /**
     * Marks the notification as read and saves it
     * @throws {Error} If notification is already read or save fails
     */
    markAsRead(): Promise<void>;
}

/**
 * Interface for Notification model static methods
 * @interface INotificationModel
 * @extends {Model<INotification>}
 */
interface INotificationModel extends Model<INotification> {
    /**
     * Gets the count of unread notifications for a user
     * @param userId - The ID of the user
     * @returns Promise resolving to the count of unread notifications
     */
    getUnreadCount(userId: Types.ObjectId): Promise<number>;
    
    /**
     * Gets notifications for a user filtered by group
     * @param userId - The ID of the user
     * @param group - The group to filter by
     * @param limit - Maximum number of notifications to return
     */
    getNotificationsByGroup(userId: Types.ObjectId, group: string, limit?: number): Promise<INotification[]>;
    
    /**
     * Clears old notifications that have been read
     * @param days - Number of days old to consider for deletion
     */
    clearOldNotifications(days?: number): Promise<{ deletedCount: number }>;
}

const notificationSchema = new Schema<INotification>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    type: {
        type: String,
        required: [true, 'Notification type is required'],
        enum: {
            values: [
                'task_assignment',
                'task_update',
                'deadline_reminder',
                'workload_alert',
                'department_announcement',
                'emergency_alert',
                'system_update',
                'appointment_reminder',
                'test_results',
                'medication_reminder'
            ],
            message: '{VALUE} is not a valid notification type'
        }
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: {
            values: [
                'tasks',
                'appointments',
                'system',
                'alerts',
                'reminders',
                'medical'
            ],
            message: '{VALUE} is not a valid category'
        }
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot be longer than 200 characters']
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [1000, 'Message cannot be longer than 1000 characters']
    },
    priority: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high', 'urgent'],
            message: '{VALUE} is not a valid priority level'
        },
        default: 'medium'
    },
    group: {
        type: String,
        default: 'general',
        trim: true
    },
    sound: {
        type: {
            type: String,
            enum: {
                values: ['default', 'alert', 'reminder', 'success', 'error'],
                message: '{VALUE} is not a valid sound type'
            }
        },
        volume: {
            type: Number,
            min: [0, 'Volume cannot be less than 0'],
            max: [1, 'Volume cannot be greater than 1'],
            validate: {
                validator: function(v: number) {
                    return isValidVolume(v);
                },
                message: 'Invalid volume value'
            }
        }
    },
    data: {
        type: Schema.Types.Mixed,
        validate: {
            validator: function(v: unknown) {
                return v === null || typeof v === 'object';
            },
            message: 'Data must be a valid object'
        }
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: {
        type: Date
    },
    expiresAt: {
        type: Date,
        index: true,
        validate: {
            validator: function(v: Date) {
                return v > new Date();
            },
            message: 'Expiry date must be in the future'
        }
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 }, { 
    name: 'user_read_created',
    background: true 
});
notificationSchema.index({ userId: 1, type: 1, category: 1 }, { 
    name: 'user_type_category',
    background: true 
});
notificationSchema.index({ expiresAt: 1 }, { 
    expireAfterSeconds: 0,
    name: 'ttl_cleanup'
});

// Instance method to mark notification as read
notificationSchema.methods.markAsRead = async function(this: INotification): Promise<void> {
    try {
        if (this.read) {
            throw new Error('Notification is already marked as read');
        }
        
        this.read = true;
        this.readAt = new Date();
        await this.save();
    } catch (error) {
        throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
};

// Static methods
notificationSchema.statics.getUnreadCount = async function(
    userId: Types.ObjectId
): Promise<number> {
    try {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID provided');
        }
        return await this.countDocuments({ userId, read: false });
    } catch (error) {
        throw new Error(`Failed to get unread count: ${error.message}`);
    }
};

notificationSchema.statics.getNotificationsByGroup = async function(
    userId: Types.ObjectId,
    group: string,
    limit: number = 20
): Promise<INotification[]> {
    try {
        if (!Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID provided');
        }
        
        if (typeof limit !== 'number' || limit < 1) {
            throw new Error('Invalid limit provided');
        }

        return await this.find({ userId, group })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    } catch (error) {
        throw new Error(`Failed to get notifications by group: ${error.message}`);
    }
};

notificationSchema.statics.clearOldNotifications = async function(
    days: number = 30
): Promise<{ deletedCount: number }> {
    try {
        if (typeof days !== 'number' || days < 1) {
            throw new Error('Invalid days parameter provided');
        }

        const date = new Date();
        date.setDate(date.getDate() - days);
        
        const result = await this.deleteMany({
            createdAt: { $lt: date },
            read: true
        });

        return { deletedCount: result.deletedCount || 0 };
    } catch (error) {
        throw new Error(`Failed to clear old notifications: ${error.message}`);
    }
};

// Pre-save middleware to set category based on type
notificationSchema.pre('save', function(this: INotification, next: (err?: CallbackError) => void) {
    try {
        if (!this.category) {
            switch (this.type) {
                case 'task_assignment':
                case 'task_update':
                    this.category = 'tasks';
                    break;
                case 'appointment_reminder':
                    this.category = 'appointments';
                    break;
                case 'system_update':
                    this.category = 'system';
                    break;
                case 'emergency_alert':
                case 'workload_alert':
                    this.category = 'alerts';
                    break;
                case 'deadline_reminder':
                case 'medication_reminder':
                    this.category = 'reminders';
                    break;
                case 'test_results':
                    this.category = 'medical';
                    break;
                default:
                    this.category = 'system';
            }
        }
        next();
    } catch (error) {
        next(error as CallbackError);
    }
});

// Post-save middleware for logging
notificationSchema.post('save', function(doc: INotification) {
    // Log notification creation/update
    console.info(`Notification ${doc._id} saved for user ${doc.userId}`);
});

export const Notification: INotificationModel = mongoose.model<INotification, INotificationModel>('Notification', notificationSchema);

export default Notification; 