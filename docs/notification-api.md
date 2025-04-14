# Notification API Documentation

## Overview

The Notification API provides a comprehensive system for managing user notification preferences and delivering notifications across different channels (WebSocket, email) with support for various notification types, priorities, and delivery rules.

## Authentication

All API endpoints require authentication using a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Base URL

```
/api/notification-preferences
```

## Endpoints

### Get Notification Preferences

Retrieves the current notification preferences for the authenticated user.

```http
GET /api/notification-preferences
```

#### Response

```json
{
  "enabled": true,
  "emailNotifications": {
    "enabled": true,
    "frequency": "immediate"
  },
  "pushNotifications": {
    "enabled": true,
    "sound": {
      "enabled": true,
      "volume": 0.7
    },
    "vibration": true
  },
  "categories": {
    "tasks": {
      "enabled": true,
      "priority": "low"
    },
    "appointments": {
      "enabled": true,
      "priority": "medium"
    },
    "alerts": {
      "enabled": true,
      "priority": "high"
    }
  },
  "quietHours": {
    "enabled": false,
    "start": "22:00",
    "end": "07:00",
    "allowUrgent": true
  },
  "groups": [
    {
      "name": "general",
      "enabled": true,
      "priority": "medium",
      "sound": "default"
    }
  ]
}
```

### Update Notification Preferences

Updates the global notification preferences.

```http
PATCH /api/notification-preferences
```

#### Request Body

```json
{
  "enabled": boolean,
  "emailNotifications": {
    "enabled": boolean,
    "frequency": "immediate" | "hourly" | "daily" | "weekly"
  },
  "pushNotifications": {
    "enabled": boolean,
    "sound": {
      "enabled": boolean,
      "volume": number
    },
    "vibration": boolean
  }
}
```

### Update Quiet Hours

Updates the quiet hours settings.

```http
PATCH /api/notification-preferences/quiet-hours
```

#### Request Body

```json
{
  "enabled": boolean,
  "start": "HH:mm",
  "end": "HH:mm",
  "allowUrgent": boolean
}
```

### Update Category Preferences

Updates preferences for a specific notification category.

```http
PATCH /api/notification-preferences/categories
```

#### Request Body

```json
{
  "category": string,
  "enabled": boolean,
  "priority": "low" | "medium" | "high" | "urgent"
}
```

### Create Notification Group

Creates a new notification group.

```http
POST /api/notification-preferences/groups
```

#### Request Body

```json
{
  "name": string,
  "enabled": boolean,
  "priority": "low" | "medium" | "high" | "urgent",
  "sound": "default" | "alert" | "reminder" | "success" | "error"
}
```

### Update Notification Group

Updates an existing notification group.

```http
PATCH /api/notification-preferences/groups
```

#### Request Body

```json
{
  "groupName": string,
  "updates": {
    "name": string,
    "enabled": boolean,
    "priority": "low" | "medium" | "high" | "urgent",
    "sound": "default" | "alert" | "reminder" | "success" | "error"
  }
}
```

### Delete Notification Group

Deletes a notification group.

```http
DELETE /api/notification-preferences/groups/:groupName
```

## WebSocket Events

The notification system uses WebSocket for real-time notifications. Connect to `/ws` with your authentication token.

### Connection

```javascript
const ws = new WebSocket('ws://your-api-url/ws');
ws.send(JSON.stringify({
  type: 'auth',
  userId: 'your-user-id'
}));
```

### Event Types

#### Incoming Events

1. **Notification**
```json
{
  "type": "notification",
  "data": {
    "id": string,
    "type": string,
    "title": string,
    "message": string,
    "priority": "low" | "medium" | "high" | "urgent",
    "category": string,
    "group": string,
    "sound": {
      "type": string,
      "volume": number
    },
    "timestamp": string
  }
}
```

2. **Preferences Updated**
```json
{
  "type": "preferences_updated",
  "data": NotificationPreferences
}
```

3. **Group Created/Updated**
```json
{
  "type": "group_created" | "group_updated",
  "data": {
    "name": string,
    "enabled": boolean,
    "priority": string,
    "sound": string
  }
}
```

#### Outgoing Events

1. **Mark as Read**
```json
{
  "type": "notification_read",
  "data": {
    "notificationId": string
  }
}
```

2. **Update Preferences**
```json
{
  "type": "update_preferences",
  "data": Partial<NotificationPreferences>
}
```

## Notification Types

The system supports various notification types with different priorities and behaviors:

1. **Task Notifications**
   - `task_assignment`: New task assignments
   - `task_update`: Updates to existing tasks
   - Priority based on task priority

2. **Deadline Reminders**
   - Sent 24 hours before deadline
   - Priority based on task priority

3. **Workload Alerts**
   - Triggered when workload exceeds threshold
   - Default priority: medium

4. **Department Announcements**
   - Broadcast to all department members
   - Configurable priority

5. **Emergency Alerts**
   - Always high priority
   - Bypasses quiet hours if allowed
   - Requires immediate attention

## Priority Levels

- `low`: Regular updates and non-urgent information
- `medium`: Important but not time-critical notifications
- `high`: Time-sensitive or important notifications
- `urgent`: Emergency alerts and critical notifications

## Error Responses

```json
{
  "error": {
    "code": string,
    "message": string
  }
}
```

Common error codes:
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error 