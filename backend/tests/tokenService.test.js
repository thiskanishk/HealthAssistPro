
const tokenService = require('../src/services/tokenService');
const mongoose = require('mongoose');

describe('Token Service', () => {
  test('should generate access token for user', () => {
    const mockUser = { _id: new mongoose.Types.ObjectId(), role: 'Doctor' };
    const token = tokenService.generateAccessToken(mockUser);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });
});
