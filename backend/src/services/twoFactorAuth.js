const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User } = require('../models/User');

class TwoFactorAuthService {
  constructor() {
    this.issuer = 'HealthAssist Pro';
  }

  // Generate new 2FA secret for a user
  async generateSecret(userId) {
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `${this.issuer} (${userId})`,
      issuer: this.issuer
    });

    // Generate QR code
    const otpauthUrl = secret.otpauth_url;
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return {
      secret: secret.base32,
      qrCode,
      otpauthUrl
    };
  }

  // Verify TOTP token
  verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // Allow 30 seconds clock skew
    });
  }

  // Enable 2FA for a user
  async enable2FA(userId, token) {
    const user = await User.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new Error('User not found or 2FA not initialized');
    }

    // Verify the token before enabling
    const isValid = this.verifyToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    user.twoFactorEnabled = true;
    await user.save();

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    user.backupCodes = backupCodes.map(code => ({
      code: this.hashBackupCode(code),
      used: false
    }));
    await user.save();

    return {
      enabled: true,
      backupCodes: backupCodes // Return plain backup codes to user
    };
  }

  // Generate backup codes
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(speakeasy.generateSecret({ length: 10 }).base32);
    }
    return codes;
  }

  // Hash backup code
  hashBackupCode(code) {
    return crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');
  }

  // Verify backup code
  async verifyBackupCode(userId, code) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const hashedCode = this.hashBackupCode(code);
    const backupCode = user.backupCodes.find(
      bc => bc.code === hashedCode && !bc.used
    );

    if (backupCode) {
      backupCode.used = true;
      await user.save();
      return true;
    }

    return false;
  }

  // Disable 2FA
  async disable2FA(userId, token) {
    const user = await User.findById(userId);
    if (!user || !user.twoFactorEnabled) {
      throw new Error('User not found or 2FA not enabled');
    }

    // Verify the token before disabling
    const isValid = this.verifyToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.backupCodes = [];
    await user.save();

    return { disabled: true };
  }
}

module.exports = new TwoFactorAuthService(); 