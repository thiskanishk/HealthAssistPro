# Testing Guide

## Overview

This guide covers testing practices for the HealthAssist Pro application, including unit tests, integration tests, and end-to-end tests.

## Testing Stack

### Frontend Testing
- Jest
- React Testing Library
- MSW (Mock Service Worker)
- Jest-DOM
- Testing-Library/User-Event

### Backend Testing
- Jest
- Supertest
- MongoDB Memory Server
- Sinon
- Chai

## Test Types

### 1. Unit Tests

Unit tests verify individual components and functions in isolation.

#### Frontend Unit Tests

```typescript
// components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Backend Unit Tests

```typescript
// services/notificationService.test.ts
import { NotificationService } from '../services/notificationService';
import { NotificationModel } from '../models/notification';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
  });

  it('creates notification with correct data', async () => {
    const notification = await service.createNotification({
      userId: 'user123',
      type: 'appointment',
      message: 'Test notification'
    });

    expect(notification).toHaveProperty('id');
    expect(notification.userId).toBe('user123');
    expect(notification.type).toBe('appointment');
  });
});
```

### 2. Integration Tests

Integration tests verify interactions between components and services.

#### Frontend Integration Tests

```typescript
// features/NotificationPreferences.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import NotificationPreferences from './NotificationPreferences';

const server = setupServer(
  rest.get('/api/notification-preferences', (req, res, ctx) => {
    return res(
      ctx.json({
        enabled: true,
        categories: {
          appointments: true,
          messages: false
        }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('NotificationPreferences', () => {
  it('loads and displays user preferences', async () => {
    render(<NotificationPreferences />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Appointments')).toBeChecked();
      expect(screen.getByLabelText('Messages')).not.toBeChecked();
    });
  });
});
```

#### Backend Integration Tests

```typescript
// routes/notifications.test.ts
import request from 'supertest';
import app from '../app';
import { createTestUser, generateToken } from '../test/helpers';

describe('Notification Routes', () => {
  let token: string;
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    token = generateToken(user);
  });

  it('returns user notifications', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.notifications)).toBe(true);
  });
});
```

### 3. End-to-End Tests

E2E tests verify the entire application flow.

```typescript
// e2e/notification-flow.test.ts
import { test, expect } from '@playwright/test';

test('notification flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Navigate to preferences
  await page.click('[data-testid="preferences-link"]');
  
  // Update preferences
  await page.click('[data-testid="appointments-toggle"]');
  await page.click('[data-testid="save-button"]');

  // Verify toast message
  const toast = page.locator('[data-testid="toast"]');
  await expect(toast).toHaveText('Preferences updated successfully');
});
```

## Test Organization

### Directory Structure

```
src/
├── __tests__/          # Test utilities and setup
├── components/
│   ├── __tests__/     # Component tests
│   └── __mocks__/     # Component mocks
├── services/
│   ├── __tests__/     # Service tests
│   └── __mocks__/     # Service mocks
└── e2e/               # End-to-end tests
```

### Test Files Naming

- Unit tests: `ComponentName.test.tsx`
- Integration tests: `ComponentName.integration.test.tsx`
- E2E tests: `feature-name.e2e.test.ts`

## Test Setup

### Frontend Setup

```typescript
// jest.setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Backend Setup

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts'
  ]
};
```

## Testing Best Practices

### 1. Test Organization

- Group related tests using `describe`
- Use clear test descriptions
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
describe('NotificationService', () => {
  describe('createNotification', () => {
    it('creates valid notification', async () => {
      // Arrange
      const data = { message: 'Test' };

      // Act
      const result = await service.createNotification(data);

      // Assert
      expect(result).toHaveProperty('id');
    });
  });
});
```

### 2. Mocking

- Mock external dependencies
- Use consistent mock data
- Reset mocks between tests

```typescript
jest.mock('../services/api', () => ({
  fetchNotifications: jest.fn()
}));

beforeEach(() => {
  jest.clearAllMocks();
});
```

### 3. Test Coverage

- Aim for high coverage (80%+)
- Focus on critical paths
- Don't test implementation details

```bash
# Run tests with coverage
npm test -- --coverage
```

### 4. Continuous Integration

- Run tests in CI pipeline
- Enforce coverage thresholds
- Automate test reporting

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm test
      - run: npm run test:e2e
```

## Common Testing Patterns

### 1. Component Testing

```typescript
// Testing user interactions
it('updates when clicked', () => {
  render(<Counter />);
  const button = screen.getByRole('button');
  fireEvent.click(button);
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

### 2. Hook Testing

```typescript
// Testing custom hooks
import { renderHook, act } from '@testing-library/react-hooks';

it('updates count', () => {
  const { result } = renderHook(() => useCounter());
  act(() => {
    result.current.increment();
  });
  expect(result.current.count).toBe(1);
});
```

### 3. API Testing

```typescript
// Testing API endpoints
it('returns 401 for unauthorized access', async () => {
  const response = await request(app)
    .get('/api/protected-route');
  expect(response.status).toBe(401);
});
```

## Debugging Tests

### 1. Jest Debug Mode

```bash
# Run specific test file in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand path/to/test
```

### 2. Visual Debugging

```typescript
// Add debug statements
screen.debug();
console.log(prettyDOM(container));
```

### 3. Test Environment

```typescript
// Force test environment
process.env.NODE_ENV = 'test';
```

## Performance Testing

### 1. Load Testing

```typescript
// Using k6 for load testing
import http from 'k6/http';

export default function() {
  http.get('http://localhost:5000/api/health');
}
```

### 2. Response Time Testing

```typescript
it('responds within 100ms', async () => {
  const start = Date.now();
  await request(app).get('/api/notifications');
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(100);
});
```

## Test Maintenance

### 1. Regular Updates

- Keep dependencies updated
- Review and update tests
- Remove obsolete tests

### 2. Documentation

- Document test setup
- Maintain testing guidelines
- Update test documentation

### 3. Code Review

- Review test coverage
- Check test quality
- Enforce testing standards 