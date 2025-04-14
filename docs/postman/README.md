# HealthAssist Pro - Notification API Postman Collection

## Overview

This Postman collection provides a comprehensive set of API endpoints for the HealthAssist Pro notification system. The API allows you to manage notifications, user preferences, categories, and notification groups.

## Getting Started

1. Import the collection file `notification-api.postman_collection.json` into Postman
2. Set up your environment variables:
   - `baseUrl`: API base URL (e.g., `http://localhost:3000/api` for local development)
   - `email`: Your test user email
   - `password`: Your test user password
   - `authToken`: Will be set automatically after login
   - `notificationId`: ID of a notification for testing
   - `groupId`: ID of a notification group for testing
   - `category`: Notification category for testing
   - `startDate`: Start date for metrics (ISO format)
   - `endDate`: End date for metrics (ISO format)

## Authentication

1. Use the "Login" request in the Authentication folder
2. The response will contain a JWT token
3. The token will be automatically set as the `authToken` environment variable

## API Endpoints

### Notifications

- **GET /notifications**
  - Get all notifications with pagination and filtering
  - Query parameters:
    - `page`: Page number (default: 1)
    - `limit`: Items per page (default: 10)
    - `type`: Filter by notification type
    - `category`: Filter by category
    - `priority`: Filter by priority

- **POST /notifications**
  - Create a new notification
  - Required fields:
    - `type`: Notification type
    - `category`: Notification category
    - `title`: Short title
    - `message`: Detailed message
    - `priority`: Priority level

- **PATCH /notifications/{notificationId}/read**
  - Mark a notification as read

- **DELETE /notifications/{notificationId}**
  - Delete a notification

- **GET /notifications/metrics**
  - Get notification metrics
  - Query parameters:
    - `startDate`: Start date (ISO format)
    - `endDate`: End date (ISO format)

### Preferences

- **GET /notifications/preferences**
  - Get user notification preferences

- **PATCH /notifications/preferences**
  - Update user notification preferences
  - Configurable settings:
    - Global enable/disable
    - Sound settings
    - Category preferences
    - Type preferences
    - Quiet hours
    - Display settings

### Categories

- **PATCH /notifications/preferences/categories/{category}**
  - Update category-specific preferences
  - Configurable settings:
    - Enable/disable
    - Priority
    - Sound settings
    - Auto-expire
    - Batch notifications

### Groups

- **POST /notifications/groups**
  - Create a new notification group
  - Required fields:
    - `name`: Group name
    - `enabled`: Boolean
    - `members`: Array of user IDs

- **PATCH /notifications/groups/{groupId}**
  - Update an existing group
  - Updatable fields:
    - `enabled`: Boolean
    - `priority`: Priority level
    - `sound`: Sound settings
    - `members`: Array of user IDs

- **DELETE /notifications/groups/{groupId}**
  - Delete a notification group

## Data Types

### Notification Types
- `appointment`: Medical appointment notifications
- `medication`: Medication reminders
- `lab_result`: Laboratory test results
- `system`: System-level notifications
- `chat`: Chat messages
- `telemedicine`: Telemedicine session notifications
- `payment`: Payment and billing notifications
- `reminder`: General reminders
- `prescription`: Prescription-related notifications
- `test_result`: General test results
- `message`: General messages

### Categories
- `medical`: Medical-related notifications
- `administrative`: Administrative notifications
- `billing`: Billing and payment notifications
- `system`: System notifications
- `communication`: Communication-related notifications
- `urgent`: Time-sensitive notifications
- `important`: High-priority notifications
- `info`: Informational notifications
- `marketing`: Marketing and promotional notifications

### Priority Levels
- `high`: High priority
- `medium`: Medium priority
- `low`: Low priority
- `urgent`: Urgent priority

## Error Handling

The API uses standard HTTP status codes:

- `200 OK`: Successful request
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `500 Internal Server Error`: Server error

Error responses follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {
      "field": "Error details"
    }
  }
}
```

## Rate Limiting

- Rate limit: 100 requests per minute per user
- Rate limit headers:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time until limit reset

## WebSocket Events

Connect to the WebSocket endpoint: `{{wsUrl}}`

1. Authentication:
```json
{
  "type": "auth",
  "token": "{{authToken}}"
}
```

2. Event types:
- `notification:new`: New notification
- `notification:updated`: Notification updated
- `notification:deleted`: Notification deleted
- `preferences:updated`: Preferences updated

## Testing Flow

1. Authenticate using the Login request
2. Create a notification
3. Get all notifications
4. Mark a notification as read
5. Update preferences
6. Create a notification group
7. Update group settings
8. Test quiet hours
9. Check metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For support, contact:
- Email: support@healthassist.pro
- Documentation: https://docs.healthassist.pro
- API Status: https://status.healthassist.pro 