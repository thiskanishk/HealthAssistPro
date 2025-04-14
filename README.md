# HealthAssist Pro

A comprehensive healthcare management system with telemedicine and notification capabilities.

## Features

- Real-time notifications system
- Telemedicine consultation history
- User notification preferences management
- WebSocket support for real-time updates
- Comprehensive API documentation

## Project Structure

```
health-assist-pro/
├── frontend/           # React frontend application
├── backend/           # Node.js backend application
├── docs/             # Documentation
│   ├── postman/     # Postman collection and environments
│   └── ci-cd.md     # CI/CD documentation
└── .github/         # GitHub Actions workflows
```

## Prerequisites

- Node.js 18.x
- npm 8.x or later
- MongoDB 5.x

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/your-username/health-assist-pro.git
cd health-assist-pro
```

2. Install dependencies:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Set up environment variables:
```bash
# Frontend
cp frontend/.env.example frontend/.env

# Backend
cp backend/.env.example backend/.env
```

4. Start the development servers:
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm start
```

## Development

- Frontend runs on: http://localhost:3000
- Backend runs on: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs

## Testing

```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests
cd backend
npm test
```

## Deployment

The project uses GitHub Actions for CI/CD. See [CI/CD documentation](docs/ci-cd.md) for details.

- Staging: https://staging-api.healthassist.pro
- Production: https://api.healthassist.pro

## API Documentation

- [Postman Collection](docs/postman/README.md)
- [API Documentation](docs/notification-api.md)

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please:
- Create a GitHub issue
- Contact: support@healthassist.pro
- Check status: https://status.healthassist.pro 