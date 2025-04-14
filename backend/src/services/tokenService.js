
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateAccessToken(user) {
  return jwt.sign({ _id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function generateRefreshToken(user) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);

  await RefreshToken.create({
    userId: user._id,
    token,
    expiresAt
  });

  return token;
}

async function validateRefreshToken(token) {
  const existingToken = await RefreshToken.findOne({ token }).populate('userId');
  if (!existingToken || existingToken.expiresAt < Date.now()) {
    return null;
  }
  return existingToken.userId;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  validateRefreshToken
};
