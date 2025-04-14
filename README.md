# HealthAssistPro - Healthcare Management System

## Overview
HealthAssistPro is a comprehensive healthcare management system that leverages AI for diagnosis assistance, prescription management, and patient care. The system provides real-time interaction between healthcare providers and patients, advanced medical data visualization, and intelligent health monitoring.

## Key Features

### AI-Powered Diagnosis
- Symptom analysis with confidence levels
- AI-assisted diagnosis suggestions
- Medical history analysis
- Treatment recommendations
- Drug interaction checking

### Patient Management
- Electronic Health Records (EHR)
- Medical history timeline
- Lab results tracking
- Appointment scheduling
- Prescription management

### Real-time Communication
- Secure chat with healthcare providers
- File sharing capabilities
- Appointment notifications
- Medication reminders
- Real-time health alerts

### Data Visualization
- Health metrics tracking
- Lab results visualization
- Treatment progress monitoring
- Medical history analytics
- Trend analysis

### Security Features
- HIPAA compliance
- End-to-end encryption
- Role-based access control
- Audit logging
- Rate limiting

## Technology Stack

### Backend
- Node.js with Express
- MongoDB for database
- Redis for caching and session management
- Socket.IO for real-time communication
- OpenAI GPT-4 for AI features

### Frontend
- React with TypeScript
- Material-UI for components
- Recharts for data visualization
- React Query for state management
- Socket.IO client for real-time features

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Redis
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/HealthAssistPro.git
cd HealthAssistPro
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:
```bash
# Backend (.env)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/healthassistpro
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key

# Frontend (.env)
REACT_APP_API_URL=http://localhost:5000
```

4. Start the development servers:
```bash
# Start backend
cd backend
npm run dev

# Start frontend
cd frontend
npm start
```

## Project Structure

```
health-assist-pro/
├── frontend/                  # Web application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── features/         # Feature-specific modules
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # Redux store configuration
│   │   └── utils/           # Helper functions
├── mobile/                   # Mobile applications
│   ├── ios/                 # iOS specific code
│   ├── android/             # Android specific code
│   └── src/                 # Shared React Native code
├── backend/                  # Server application
│   ├── src/
│   │   ├── api/            # API routes and controllers
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper functions
├── shared/                   # Shared utilities
│   ├── types/              # TypeScript definitions
│   └── constants/          # Shared constants
└── docs/                    # Documentation
    ├── api/                # API documentation
    ├── setup/              # Setup guides
    └── architecture/       # Architecture diagrams
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18.x or later
- MongoDB 6.x
- Redis 7.x
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-org/health-assist-pro.git
cd health-assist-pro
```

2. Install dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install

# Install mobile dependencies
cd ../mobile && npm install
```

3. Configure environment
```bash
# Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp mobile/.env.example mobile/.env

# Update environment variables with your values
```

4. Start development servers
```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm start

# Start mobile (iOS)
cd mobile && npm run ios

# Start mobile (Android)
cd mobile && npm run android
```

## 📱 Deployment

### Web Application
- Production: https://app.healthassist.pro
- Staging: https://staging.healthassist.pro

### Mobile Applications
- iOS: Available on App Store
- Android: Available on Google Play Store

### API Endpoints
- Production: https://api.healthassist.pro
- Staging: https://staging-api.healthassist.pro

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run frontend tests
cd frontend && npm test

# Run backend tests
cd backend && npm test

# Run mobile tests
cd mobile && npm test

# Run E2E tests
npm run test:e2e
```

## 📚 Documentation

- [API Documentation](docs/API.md)
- [Architecture Overview](docs/architecture/README.md)
- [Development Guide](docs/setup/development.md)
- [Deployment Guide](docs/setup/deployment.md)
- [Security Measures](docs/security/README.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## 🔐 Security

HealthAssist Pro is HIPAA-compliant and implements:
- End-to-end encryption
- Multi-factor authentication
- Regular security audits
- Automated vulnerability scanning
- Data backup and recovery
- Access control and audit logs

## 🤝 Contributing

1. Review our [Contributing Guidelines](CONTRIBUTING.md)
2. Fork the repository
3. Create your feature branch (`git checkout -b feature/AmazingFeature`)
4. Commit your changes (`git commit -m 'Add AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Healthcare providers and patients who provided valuable feedback
- Open source community for various tools and libraries
- Contributors and maintainers
- Medical professionals for domain expertise

## 📞 Support

- Technical Support: support@healthassist.pro
- General Inquiries: contact@healthassist.pro
- Emergency Support: Available 24/7 at +1-800-HEALTH-PRO
- Status Page: https://status.healthassist.pro

# API Documentation

For detailed API documentation, please refer to:

1. [API Documentation](docs/API.md) - Comprehensive API documentation
2. [OpenAPI Specification](src/docs/swagger.yaml) - OpenAPI/Swagger specification
3. [Postman Collection](docs/Health_Assist_Pro.postman_collection.json) - Ready-to-use Postman collection

## Quick Start with API

1. Import the Postman collection
2. Set up environment variables:
   - `base_url`: API base URL
   - `auth_token`: Authentication token (after login)

3. Basic authentication flow:
   ```bash
   # Login
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password123"}'

   # Use the returned token for authenticated requests
   curl -X GET http://localhost:3000/api/v1/users \
     -H "Authorization: Bearer YOUR_TOKEN"
   ``` 