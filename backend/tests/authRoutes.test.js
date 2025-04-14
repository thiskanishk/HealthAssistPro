
const request = require('supertest');
const express = require('express');
const authRoutes = require('../src/routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

describe('POST /api/v1/auth/refresh-token', () => {
  it('should return 400 if refresh token is not provided', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh-token')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Refresh token required/);
  });
});
