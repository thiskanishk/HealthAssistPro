# Development Guide

## Getting Started

### Prerequisites

1. **Node.js and npm**
   - Install Node.js 18.x from [nodejs.org](https://nodejs.org/)
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **MongoDB**
   - Install MongoDB 5.x from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Start MongoDB service
   - Verify installation:
     ```bash
     mongod --version
     ```

3. **Development Tools**
   - VS Code (recommended)
   - MongoDB Compass (optional)
   - Postman

### Environment Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/health-assist-pro.git
   cd health-assist-pro
   ```

2. **Install Dependencies**
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. **Environment Variables**

   Frontend (.env):
   ```env
   REACT_APP_API_URL=http://localhost:5000
   REACT_APP_WS_URL=ws://localhost:5000
   REACT_APP_ENV=development
   ```

   Backend (.env):
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/health-assist-pro
   JWT_SECRET=your-jwt-secret
   JWT_EXPIRATION=1d
   ```

## Development Workflow

### Code Structure

```
health-assist-pro/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── public/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
└── docs/
```

### Running the Application

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend Development Server**
   ```bash
   cd frontend
   npm start
   ```

3. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

### Development Standards

#### Code Style

1. **TypeScript**
   - Use strict mode
   - Define interfaces for all data structures
   - Use proper type annotations

2. **React Components**
   - Use functional components
   - Implement proper prop types
   - Follow component composition patterns

3. **API Endpoints**
   - Follow RESTful conventions
   - Implement proper validation
   - Use appropriate HTTP methods

#### Naming Conventions

1. **Files and Directories**
   - React components: PascalCase
   - Utilities and hooks: camelCase
   - Test files: `.test.ts` or `.test.tsx`

2. **Variables and Functions**
   - Use descriptive names
   - Follow camelCase convention
   - Prefix private methods with underscore

3. **Constants**
   - Use UPPER_SNAKE_CASE
   - Group related constants

### Testing

1. **Unit Tests**
   ```bash
   # Run frontend tests
   cd frontend
   npm test

   # Run backend tests
   cd backend
   npm test
   ```

2. **Integration Tests**
   ```bash
   cd backend
   npm run test:integration
   ```

3. **E2E Tests**
   ```bash
   npm run test:e2e
   ```

### Git Workflow

1. **Branch Naming**
   - Feature: `feature/description`
   - Bug fix: `fix/description`
   - Documentation: `docs/description`

2. **Commit Messages**
   ```
   type(scope): description

   [optional body]

   [optional footer]
   ```
   Types: feat, fix, docs, style, refactor, test, chore

3. **Pull Request Process**
   - Create feature branch
   - Make changes
   - Run tests
   - Update documentation
   - Create pull request
   - Request review

### Debugging

1. **Frontend Debugging**
   - Use React Developer Tools
   - Chrome DevTools
   - console.log statements
   - Error boundaries

2. **Backend Debugging**
   - Use VS Code debugger
   - Winston logger
   - Postman for API testing
   - MongoDB Compass for database

### Performance Optimization

1. **Frontend**
   - Implement code splitting
   - Use React.memo for optimization
   - Optimize images and assets
   - Implement caching

2. **Backend**
   - Use database indexing
   - Implement caching
   - Optimize queries
   - Use compression

### Security Best Practices

1. **Frontend**
   - Sanitize user input
   - Implement CSP
   - Use HTTPS
   - Secure token storage

2. **Backend**
   - Input validation
   - Rate limiting
   - JWT authentication
   - Error handling

### Documentation

1. **Code Documentation**
   - Use JSDoc comments
   - Document complex logic
   - Update README files
   - Keep API docs current

2. **API Documentation**
   - Use Swagger/OpenAPI
   - Document all endpoints
   - Include examples
   - Document error responses

### Troubleshooting

1. **Common Issues**
   - CORS errors
   - Authentication issues
   - Database connection
   - WebSocket connection

2. **Solutions**
   - Check environment variables
   - Verify dependencies
   - Check logs
   - Review documentation

## Deployment

### Development
```bash
# Build frontend
cd frontend
npm run build

# Start backend
cd ../backend
npm run start
```

### Staging
```bash
# Deploy to staging
npm run deploy:staging
```

### Production
```bash
# Deploy to production
npm run deploy:prod
```

## Additional Resources

1. **Documentation**
   - [API Reference](../api/api-reference.md)
   - [Architecture Guide](../technical/architecture.md)
   - [Testing Guide](../testing/testing-guide.md)

2. **External Links**
   - [React Documentation](https://reactjs.org/)
   - [Node.js Documentation](https://nodejs.org/)
   - [MongoDB Documentation](https://docs.mongodb.com/)

3. **Support**
   - Create GitHub issue
   - Contact development team
   - Check documentation 