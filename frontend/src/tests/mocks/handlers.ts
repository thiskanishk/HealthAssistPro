import { rest } from 'msw';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const handlers = [
    // Auth handlers
    rest.post(`${API_URL}/api/auth/login`, (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                token: 'fake-jwt-token',
                refreshToken: 'fake-refresh-token',
                user: {
                    id: '1',
                    email: 'test@example.com',
                    role: 'doctor'
                }
            })
        );
    }),

    // Health check handler
    rest.get(`${API_URL}/health`, (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                status: 'healthy',
                timestamp: new Date().toISOString()
            })
        );
    }),
]; 