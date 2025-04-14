# HealthAssist Pro

A modern healthcare assistance platform with real-time notifications and user preferences management.

## 🚀 Features

### Notification System
- Real-time notifications via WebSocket
- Customizable notification preferences
- Quiet hours support
- Group notifications
- Priority-based notification delivery
- Sound and visual alerts
- Read/unread status tracking

### User Preferences
- Category-based filtering
- Group management
- Quiet hours scheduling
- Priority settings
- Sound preferences

## 📚 Documentation

### API Documentation
- [Notification API Documentation](docs/notification-api.md)
- [Postman Collection](docs/postman/notification-api.postman_collection.json)
- [Postman Usage Guide](docs/postman/README.md)

### Technical Documentation
- [Component Diagrams](docs/examples/component-diagrams.md)
  - Component Architecture
  - Data Flow Diagrams
  - State Management
  - WebSocket Communication
  - Error Handling
  - Performance Monitoring

### Example Use Cases
1. Receiving and Reading Notifications
2. Updating Notification Preferences
3. Quiet Hours Management
4. Error Recovery Scenarios
5. Group Notification Handling

## 🛠️ Technical Stack

### Frontend
- React with TypeScript
- Material-UI components
- WebSocket integration
- Custom hooks for state management
- Error boundaries for reliability

### Backend
- Node.js
- MongoDB with Mongoose
- WebSocket server
- RESTful API
- Notification service

## 🏗️ Project Structure

```
health-assist-pro/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── notifications/
│   │   │   │   ├── NotificationBadge.tsx
│   │   │   │   ├── NotificationDrawer.tsx
│   │   │   │   └── PreferencesForm.tsx
│   │   ├── hooks/
│   │   │   ├── useNotifications.ts
│   │   │   └── useNotificationPreferences.ts
│   │   └── contexts/
│   │       └── NotificationContext.tsx
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Notification.js
│   │   │   └── NotificationPreferences.js
│   │   ├── controllers/
│   │   │   └── notificationPreferencesController.js
│   │   ├── services/
│   │   │   └── notificationService.js
│   │   └── routes/
│   │       └── notificationPreferencesRoutes.js
└── docs/
    ├── notification-api.md
    ├── examples/
    │   └── component-diagrams.md
    └── postman/
        ├── notification-api.postman_collection.json
        └── README.md
```

## 🚦 Getting Started

1. Clone the repository
```bash
git clone https://github.com/your-org/health-assist-pro.git
cd health-assist-pro
```

2. Install dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables
```bash
# Backend (.env)
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret

# Frontend (.env)
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
```

4. Start the development servers
```bash
# Start backend server
cd backend
npm run dev

# Start frontend server
cd ../frontend
npm start
```

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### API Testing
1. Import the Postman collection from `docs/postman/notification-api.postman_collection.json`
2. Set up environment variables as described in `docs/postman/README.md`
3. Follow the testing flow in the documentation

## 📱 Environment Templates

- [Local Environment](docs/postman/environments/local.postman_environment.json)
- [Staging Environment](docs/postman/environments/staging.postman_environment.json)
- [Production Environment](docs/postman/environments/production.postman_environment.json)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Material-UI for the component library
- MongoDB for the database
- Socket.io for real-time communications 