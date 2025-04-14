# 🏥 HealthAssistPro

HealthAssistPro is an intelligent healthcare management system that combines AI-powered assistance with comprehensive patient care management. It helps healthcare providers streamline their operations while providing patients with better access to healthcare services and information.

## 🎯 Purpose

HealthAssistPro serves as a bridge between healthcare providers and patients, offering:
- AI-powered health assistance and preliminary diagnostics
- Secure patient data management
- Real-time health monitoring
- Appointment scheduling and management
- Electronic health records (EHR) integration

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- [Docker](https://www.docker.com/get-started) (version 20.10 or higher)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0 or higher)
- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) (version 6 or higher)

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/HealthAssistPro.git
   cd HealthAssistPro
   ```

2. **Environment Setup**
   ```bash
   # Setup backend environment
   cp backend/.env.example backend/.env

   # Setup frontend environment
   cp frontend/.env.example frontend/.env
   ```

3. **Install Dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

4. **Configure Environment Variables**
   
   Edit `backend/.env` and set these important values:
   ```env
   MONGO_ROOT_USERNAME=your_username
   MONGO_ROOT_PASSWORD=your_secure_password
   JWT_SECRET=your_jwt_secret_key
   ```

### Running the Application

#### Using Docker (Recommended)

1. **Start all services**
   ```bash
   docker-compose up --build
   ```

2. **Access the applications**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB Express: http://localhost:8081

#### Manual Start (Development)

1. **Start the backend**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend**
   ```bash
   cd frontend
   npm start
   ```

### Monitoring & Troubleshooting

1. **View logs**
   ```bash
   # All services
   docker-compose logs -f

   # Specific service
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

2. **Check service status**
   ```bash
   docker-compose ps
   ```

3. **Common Issues**
   - If ports are in use, ensure ports 3000, 5000, 27017, 6379, and 8081 are available
   - For MongoDB connection issues, verify the connection string in backend/.env
   - For frontend-backend connection issues, check REACT_APP_API_URL in frontend/.env

## 🛠️ Tech Stack

### Frontend
- React.js with TypeScript
- Material-UI for components
- Redux Toolkit for state management
- Socket.IO for real-time features

### Backend
- Node.js with Express
- TypeScript for type safety
- MongoDB for database
- JWT for authentication
- Winston for logging
- OpenAI API integration

### Security Features
- JWT-based authentication
- Role-based access control
- Rate limiting and brute force protection
- XSS and CSRF protection
- Request sanitization
- Activity logging and audit trails
- IP blocking capabilities
- Secure session management

## 📁 Project Structure

```
HealthAssistPro/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── tests/             # Test files
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── store/         # Redux store
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   └── package.json
└── docker-compose.yml
```

## 🔐 Authentication & Security

- JWT-based authentication with access and refresh tokens
- Role-based access control (Admin, Doctor, Patient)
- Session management with automatic timeout
- Request rate limiting and IP blocking
- XSS protection and input sanitization
- Comprehensive security headers
- Activity logging and audit trails

## 🎯 Core Features

- **AI-Powered Health Assistant**
  - Symptom analysis
  - Preliminary health assessments
  - Treatment recommendations

- **Patient Management**
  - Electronic health records
  - Appointment scheduling
  - Prescription management
  - Medical history tracking

- **Doctor Dashboard**
  - Patient overview
  - Appointment management
  - Treatment planning
  - Prescription writing

- **Admin Features**
  - User management
  - System monitoring
  - Analytics dashboard
  - Audit logs

- **Real-time Features**
  - Instant notifications
  - Chat functionality
  - Live updates

## 🚀 Future Enhancements

- [ ] Telemedicine integration
- [ ] Machine learning for predictive analytics
- [ ] Mobile application
- [ ] Integration with wearable devices
- [ ] Advanced reporting and analytics
- [ ] Multi-language support

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test
```

## 🐳 Docker Deployment

1. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

2. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙌 Credits

Developed by the HealthAssistPro Team

## 📞 Support

For support, email support@healthassistpro.com or join our Slack channel.

# 🧑‍⚕️ Role-Based Access Guide – HealthAssist Pro

This guide explains how role-based access and dashboards are implemented in HealthAssist Pro.

---

## 👥 Roles Supported

- **Doctor**: Can diagnose patients, view and export treatments, and manage history.
- **Nurse**: Can create patient entries, input vitals, and track follow-ups.
- **Admin**: Can view audit logs, manage users, and monitor the system.

---

## 🔐 Backend (Node.js)

- **Middleware**: `authorizeRoles(...allowedRoles)` restricts access by role.
- **Protected Routes**:
  - `/api/v1/diagnose` → Doctor only
  - `/api/v1/patients/create` → Doctor or Nurse
  - `/api/v1/admin/audit` → Admin only

Middleware path: `backend/src/middlewares/authorizeRoles.js`

---

## 🖥️ Frontend (React + Material UI)

### Dashboards

Each role has a dedicated dashboard:

- `/dashboard/doctor` → `DoctorDashboard.tsx`
- `/dashboard/nurse` → `NurseDashboard.tsx`
- `/dashboard/admin` → `AdminDashboard.tsx`

Routes configured in: `frontend/src/routes/AppRoutes.tsx`

### ProtectedRoute Component

Located at: `frontend/src/components/ProtectedRoute.tsx`

Used to wrap role-restricted routes.

### Role-Based Redirect

- `useLoginRedirect.ts` automatically redirects users to their dashboard after login.
- Based on `user.role` from the auth context.

---

## 🧪 Testing Access

- Ensure JWT contains the `role` field.
- Use different test accounts to verify routing behavior.
- Accessing unauthorized routes redirects to `/unauthorized`.

---

## 📁 Key Files

- `backend/src/middlewares/authorizeRoles.js`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/pages/DoctorDashboard.tsx`
- `frontend/src/pages/NurseDashboard.tsx`
- `frontend/src/pages/AdminDashboard.tsx`
- `frontend/src/hooks/useLoginRedirect.ts`
- `frontend/src/routes/AppRoutes.tsx`

---

For any role mismatch or unauthorized attempts, the user is redirected to `/unauthorized`.

## 📁 Additional Test Files

- `frontend/src/tests/setup.ts`
- `frontend/src/tests/mocks/`
- `frontend/src/__tests__/`

## 📁 Additional Frontend Improvements

- **Global Error Boundary and Error Handling**
  - Added global error boundary and error handling in `frontend/src/components/common/ErrorBoundary.tsx`
  - Implemented error handling logic in `frontend/src/utils/errorHandling.ts`

