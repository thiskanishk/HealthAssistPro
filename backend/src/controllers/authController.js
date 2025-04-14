const tokenService = require('../services/tokenService');


const tokenService = require('../services/tokenService');

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    const user = await tokenService.validateRefreshToken(refreshToken);
    if (!user) return res.status(403).json({ message: 'Invalid or expired refresh token' });

    const newAccessToken = tokenService.generateAccessToken(user);
    const newRefreshToken = await tokenService.generateRefreshToken(user);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to refresh token', error: err.message });
  }
};


const nodemailer = require('nodemailer');
const users = require('../models/User');
const otpStore = new Map();

exports.sendAdminOtp = async (req, res) => {
  const { email } = req.body;
  const user = await users.findOne({ email, role: 'Admin' });
  if (!user) return res.status(404).json({ message: 'Admin not found' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, otp);

  // You would replace this with a real email service
  console.log(`Sending OTP ${otp} to ${email}`);

  // nodemailer can be setup here if needed
  res.status(200).json({ message: 'OTP sent to registered email' });
};

exports.verifyAdminOtp = async (req, res) => {
  const { email, otp } = req.body;
  const storedOtp = otpStore.get(email);
  if (storedOtp !== otp) return res.status(403).json({ message: 'Invalid OTP' });

  otpStore.delete(email);
  const user = await users.findOne({ email });
  const tokenService = require('../services/tokenService');

  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = await tokenService.generateRefreshToken(user);

  res.status(200).json({ accessToken, refreshToken });
};
