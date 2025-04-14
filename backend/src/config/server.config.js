const path = require('path');

module.exports = {
    server: {
        port: process.env.PORT || 5000,
        nodeEnv: process.env.NODE_ENV || 'development',
        apiVersion: 'v1',
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        rateLimiting: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        },
        security: {
            jwtSecret: process.env.JWT_SECRET,
            jwtExpiresIn: '1d',
            bcryptRounds: 12,
            sessionSecret: process.env.SESSION_SECRET,
            cookieSecret: process.env.COOKIE_SECRET
        },
        logging: {
            level: process.env.LOG_LEVEL || 'info',
            format: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
            directory: path.join(__dirname, '../../logs')
        },
        uploads: {
            directory: path.join(__dirname, '../../uploads'),
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
        },
        cache: {
            ttl: 60 * 60, // 1 hour
            checkPeriod: 60 // 1 minute
        }
    },
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/healthassistpro',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            autoIndex: process.env.NODE_ENV !== 'production'
        }
    },
    ai: {
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
            model: 'gpt-4',
            maxTokens: 2000,
            temperature: 0.3
        },
        azure: {
            endpoint: process.env.AZURE_AI_ENDPOINT,
            key: process.env.AZURE_AI_KEY
        }
    },
    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.NODE_ENV === 'production',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD
    }
}; 