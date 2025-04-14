const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const winston = require('winston');
const { createLogger, format, transports } = winston;
const config = require('./config');
const swaggerSpec = require('./config/swagger');
const { apiLimiter } = require('./middleware/rateLimit');
const fs = require('fs');
<<<<<<< HEAD
const dotenv = require('dotenv');
const validateEnv = require('./utils/validateEnv');
const connectDB = require('./config/database');

dotenv.config();

// Validate environment variables before starting
validateEnv();

// Connect to MongoDB
connectDB();
=======
>>>>>>> fbc769ed796143c4abc04f6781c363eadceec3d7

// Initialize express app
const app = express();
const analyzeRoutes = require('./routes/analyzeRoutes');

const setupSwagger = require('./config/swagger');
setupSwagger(app);


// Logger configuration
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.simple()
    }));
}

// Security Middleware
app.use(helmet(config.security.helmet));
app.use('/api/v1/analyze-history', analyzeRoutes);
app.use('/api/v1', require('./routes/healthRoutes'));
app.use(cors(config.security.cors));

// Request Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan(config.logging.format));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rate Limiting
app.use('/api/', apiLimiter);

// Health Check endpoint
app.use('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
    });
});

// Request logging middleware
app.use((req, res, next) => {
    logger.info({
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

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
    logger.error(err.stack);
    
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
    logger.info('Connected to MongoDB successfully');
    
    // Start Server
    app.listen(config.server.port, () => {
        logger.info(`Server is running on port ${config.server.port}`);
        logger.info(`Environment: ${config.server.nodeEnv}`);
    });
})
.catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received. Closing HTTP server and MongoDB connection');
    
    mongoose.connection.close(() => {
        logger.info('MongoDB connection closed');
        process.exit(0);
    });
});

<<<<<<< HEAD
=======
module.exports = app; er.info('MongoDB connection closed');
        process.exit(0);
    });
});

>>>>>>> fbc769ed796143c4abc04f6781c363eadceec3d7
module.exports = app; 