import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

interface DatabaseConfig {
    uri: string;
    options: {
        useNewUrlParser: boolean;
        useUnifiedTopology: boolean;
        maxPoolSize: number;
        serverSelectionTimeoutMS: number;
    };
}

interface JwtConfig {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
}

interface ServerConfig {
    port: number;
    env: string;
    apiUrl: string;
    corsOrigin: string[];
    uploadDir: string;
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
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000
        }
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
    },
    server: {
        port: parseInt(process.env.PORT || '3000', 10),
        env: process.env.NODE_ENV || 'development',
        apiUrl: process.env.API_URL || 'http://localhost:3000',
        corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
        uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')
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