const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const fs = require('fs');

// Initialize express app
const app = express();

// Security Middleware
app.use(helmet());
app.use(cors(config.cors));

// Request Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(config.logging.format));

// Rate Limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api/', limiter);

// Import routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const taskTemplateRoutes = require('./routes/taskTemplates');
const taskAnalyticsRoutes = require('./routes/taskAnalytics');

// Setup routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/task-templates', taskTemplateRoutes);
app.use('/api/task-analytics', taskAnalyticsRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
const uploadDirs = ['uploads/task-attachments'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Routes (to be implemented)
app.use('/api/users', require('./routes/users'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/diagnoses', require('./routes/diagnoses'));

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized Access'
    });
  }
  
  // Default error
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message
  });
});

// Database Connection
mongoose.connect(config.database.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB successfully');
  
  // Start Server
  app.listen(config.server.port, () => {
    console.log(`Server is running on port ${config.server.port}`);
    console.log(`Environment: ${config.server.nodeEnv}`);
  });
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server and MongoDB connection');
  
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app; 