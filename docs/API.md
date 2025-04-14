# Health Assist Pro API Documentation

## Overview

This document provides detailed information about the Health Assist Pro API endpoints, authentication, and usage.

## Base URL

- Development: `http://localhost:3000/api/v1`
- Production: `https://api.healthassistpro.com/v1`

## Authentication

### Bearer Token

Most endpoints require authentication using a Bearer token. Include the token in the Authorization header:

```http
Authorization: Bearer <your_token>
```

### API Key

Some endpoints require an API key:

```http
X-API-Key: <your_api_key>
```

## Rate Limiting

- Rate limit: 100 requests per minute
- Burst: 200 requests
- Headers returned:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Endpoints

### Authentication

#### POST /auth/login

Authenticate a user and receive a JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user"
  }
}
```

#### POST /auth/refresh

Refresh an authentication token.

**Headers Required:**
- Authorization: Bearer <current_token>

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Users

#### GET /users

Get a list of users.

**Query Parameters:**
- page (optional): Page number (default: 1)
- limit (optional): Items per page (default: 10, max: 100)

**Response:**
```json
{
  "users": [
    {
      "id": "123",
      "email": "user@example.com",
      "name": "User Name",
      "role": "user",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "pages": 10,
    "current": 1,
    "limit": 10
  }
}
```

#### POST /users

Create a new user.

**Request:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "password": "password123",
  "role": "user"
}
```

**Response:**
```json
{
  "id": "124",
  "email": "newuser@example.com",
  "name": "New User",
  "role": "user",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-01T00:00:00Z"
}
```

## Error Handling

All errors follow this format:

```json
{
  "status": "error",
  "message": "Detailed error message",
  "code": "ERROR_CODE"
}
```

Common error codes:
- `AUTH_REQUIRED`: Authentication required
- `INVALID_CREDENTIALS`: Invalid login credentials
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource not found
- `FORBIDDEN`: Permission denied

## GraphQL API

GraphQL endpoint: `/graphql`

Example query:
```graphql
query {
  me {
    id
    email
    name
    role
  }
}
```

Example mutation:
```graphql
mutation {
  login(email: "user@example.com", password: "password123") {
    token
    user {
      id
      email
      name
    }
  }
}
```

## WebSocket Events

Connect to: `wss://api.healthassistpro.com/ws`

Available events:
- `user.updated`
- `notification.received`
- `message.new`

## Rate Limiting

The API implements rate limiting based on the following rules:

- Authentication endpoints: 5 requests per minute
- Regular endpoints: 100 requests per minute
- WebSocket connections: 1 connection per user

## Caching

The API implements caching with the following rules:

- GET requests: 5 minutes
- User profile: 1 hour
- Public data: 24 hours

Cache headers are included in responses:
```http
Cache-Control: public, max-age=300
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

## API Documentation

### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "role": "string"
  }
}
```

### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "string"
}
```

### POST /api/diagnosis
Create a new diagnosis.

**Request:**
```json
{
  "patientId": "string",
  "symptoms": ["string"],
  "diagnosis": "string",
  "confidence": "number",
  "recommendations": ["string"]
}
```

### GET /api/diagnosis/{id}
Get diagnosis by ID.

### POST /api/prescriptions
Create a new prescription.

**Request:**
```json
{
  "patientId": "string",
  "medication": "string",
  "dosage": "string",
  "frequency": "string",
  "duration": "string"
}
```

[... continue with all API endpoints] 