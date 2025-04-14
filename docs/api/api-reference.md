# API Reference

## Overview

The HealthAssist Pro API is organized around REST principles. All requests should be made over HTTPS in production, and all responses are returned in JSON format.

## Base URLs

- **Development**: `http://localhost:5000`
- **Staging**: `https://staging-api.healthassist.pro`
- **Production**: `https://api.healthassist.pro`

## Authentication

### Bearer Token Authentication

All API endpoints require authentication using JWT Bearer tokens.

```http
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "User Name",
  "email": "user@example.com",
  "password": "secure_password"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Notification Preferences

#### Get User Preferences
```http
GET /api/notification-preferences
Authorization: Bearer <token>
```

Response:
```json
{
  "userId": "user_id",
  "enabled": true,
  "categories": {
    "appointments": true,
    "messages": true,
    "system": false
  },
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "07:00"
  },
  "groups": ["important", "general"]
}
```

#### Update Preferences
```http
PUT /api/notification-preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "enabled": true,
  "categories": {
    "appointments": true,
    "messages": true,
    "system": false
  }
}
```

### Notifications

#### Get User Notifications
```http
GET /api/notifications
Authorization: Bearer <token>
```

Query Parameters:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (unread/read)
- `category` (optional): Filter by category

Response:
```json
{
  "notifications": [
    {
      "id": "notification_id",
      "type": "appointment",
      "title": "Appointment Reminder",
      "message": "Your appointment is in 1 hour",
      "createdAt": "2024-01-01T10:00:00Z",
      "read": false
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100
  }
}
```

#### Mark Notification as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

### Telemedicine

#### Get Consultation History
```http
GET /api/telemedicine/consultations
Authorization: Bearer <token>
```

Query Parameters:
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status

Response:
```json
{
  "consultations": [
    {
      "id": "consultation_id",
      "doctorId": "doctor_id",
      "doctorName": "Dr. Smith",
      "date": "2024-01-01T10:00:00Z",
      "status": "completed",
      "notes": "Patient consultation notes..."
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 50
  }
}
```

## WebSocket Events

### Connection

```javascript
// Connect to WebSocket server
const socket = io('wss://api.healthassist.pro', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Events

#### Authentication
```javascript
// Emit after connection
socket.emit('authenticate', { token: 'your_jwt_token' });

// Listen for authentication result
socket.on('authenticated', (data) => {
  console.log('Authentication successful');
});
```

#### Notifications
```javascript
// Listen for new notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});

// Listen for notification updates
socket.on('notification_update', (update) => {
  console.log('Notification update:', update);
});
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

### Common Error Codes

- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `429`: Too Many Requests
- `500`: Internal Server Error

### Validation Errors

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Must be a valid email address",
      "password": "Must be at least 8 characters long"
    }
  }
}
```

## Rate Limiting

- Rate limits are applied per IP address and API token
- Default rate limit: 100 requests per minute
- Headers included in responses:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time until limit resets

## Pagination

All list endpoints support pagination using the following parameters:

- `page`: Page number (1-based)
- `limit`: Items per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 195,
    "itemsPerPage": 20
  }
}
```

## Data Types

### Timestamps
All timestamps are returned in ISO 8601 format:
```
YYYY-MM-DDTHH:mm:ss.sssZ
```

### IDs
All IDs are strings in MongoDB ObjectId format:
```
"507f1f77bcf86cd799439011"
```

## Best Practices

1. **Authentication**
   - Store JWT tokens securely
   - Refresh tokens before expiration
   - Include tokens in Authorization header

2. **Error Handling**
   - Implement proper error handling
   - Log errors appropriately
   - Display user-friendly error messages

3. **Rate Limiting**
   - Implement exponential backoff
   - Cache responses when appropriate
   - Monitor rate limit headers

4. **WebSocket**
   - Implement reconnection logic
   - Handle connection errors
   - Maintain heartbeat 