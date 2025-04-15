import dotenv from 'dotenv';
import path from 'path';
import { ConnectOptions } from 'mongoose';
import { W } from 'mongodb';

// Load environment variables from .env file
dotenv.config();

interface DatabaseConfig {
    uri: string;
    testUri: string;
    options: ConnectOptions & {
        useNewUrlParser: boolean;
        useUnifiedTopology: boolean;
        maxPoolSize: number;
        serverSelectionTimeoutMS: number;
        retryWrites: boolean;
        w: W;
    };
}

interface JwtConfig {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    refreshSecret?: string;
}

interface ServerConfig {
    port: number;
    env: string;
    apiUrl: string;
    frontendUrl: string;
    corsOrigin: string[];
    uploadDir: string;
    maxFileSize: number;
    rateLimiting: {
        windowMs: number;
        maxRequests: number;
    };
}

interface Config {
    database: DatabaseConfig;
    jwt: JwtConfig;
    server: ServerConfig;
}

// Configuration object
export const config: Config = {
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/health-assist-pro',
        testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/health-assist-test',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            retryWrites: true,
            w: 'majority' as W
        }
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
        refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key'
    },
    server: {
        port: parseInt(process.env.PORT || '8080', 10),
        env: process.env.NODE_ENV || 'development',
        apiUrl: process.env.API_URL || 'http://localhost:8080',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
        uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
        rateLimiting: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
        }
    }
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];

requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
});

export default config;
