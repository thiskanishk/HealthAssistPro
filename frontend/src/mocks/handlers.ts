import { rest } from 'msw';

const BASE_URL = process.env.REACT_APP_API_URL;

export const handlers = [
  // Auth endpoints
  rest.post(`${BASE_URL}/auth/login`, (req, res, ctx) => {
    const { email, password } = req.body as any;
    
    if (email === 'test@example.com' && password === 'password') {
      return res(
        ctx.status(200),
        ctx.json({
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
          },
          token: 'fake-jwt-token',
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ message: 'Invalid credentials' })
    );
  }),

  // Add more API mocks here
]; 