const zxcvbn = require('zxcvbn');
const securityConfig = require('../config/security');

class PasswordValidationService {
  constructor() {
    this.commonPasswords = new Set([
      'password123', 'admin123', '123456789', 'qwerty123',
      // Add more common passwords here
    ]);
  }

  validatePassword(password, userInfo = {}) {
    const errors = [];
    const config = securityConfig.passwordPolicy;

    // Check minimum length
    if (password.length < config.minLength) {
      errors.push(`Password must be at least ${config.minLength} characters long`);
    }

    // Check character requirements
    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    if (config.preventCommonPasswords && this.commonPasswords.has(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable');
    }

    // Check password strength using zxcvbn
    const strength = zxcvbn(password, [
      userInfo.email,
      userInfo.firstName,
      userInfo.lastName,
      'healthassist',
      'doctor',
      'nurse',
      'medical',
      'hospital'
    ]);

    // Ensure minimum entropy
    if (strength.entropy < securityConfig.encryption.minPasswordEntropy) {
      errors.push('Password is too weak. Please choose a stronger password');
    }

    // Check for sequential characters
    if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
      errors.push('Password contains sequential letters');
    }

    // Check for sequential numbers
    if (/012|123|234|345|456|567|678|789/.test(password)) {
      errors.push('Password contains sequential numbers');
    }

    // Check for keyboard patterns
    if (/qwert|asdfg|zxcvb/i.test(password)) {
      errors.push('Password contains keyboard patterns');
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password contains repeated characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: {
        score: strength.score,
        crackTimesDisplay: strength.crack_times_display,
        feedback: strength.feedback
      }
    };
  }

  generatePasswordPolicy() {
    const config = securityConfig.passwordPolicy;
    return {
      minLength: config.minLength,
      requireUppercase: config.requireUppercase,
      requireLowercase: config.requireLowercase,
      requireNumbers: config.requireNumbers,
      requireSpecialChars: config.requireSpecialChars,
      suggestions: [
        'Use a mix of letters, numbers, and symbols',
        'Make it at least 12 characters long',
        'Avoid using personal information',
        'Avoid using common words or patterns',
        'Consider using a passphrase'
      ]
    };
  }

  // Method to check if a password has been exposed in data breaches
  async checkPasswordBreaches(password) {
    try {
      const crypto = require('crypto');
      const https = require('https');
      
      // Generate SHA-1 hash of the password
      const hash = crypto
        .createHash('sha1')
        .update(password)
        .digest('hex')
        .toUpperCase();
      
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      // Query the HaveIBeenPwned API
      return new Promise((resolve, reject) => {
        https.get(`https://api.pwnedpasswords.com/range/${prefix}`, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            const breachCount = data
              .split('\n')
              .find(line => line.startsWith(suffix))
              ?.split(':')[1] || 0;
              
            resolve(parseInt(breachCount, 10));
          });
        }).on('error', reject);
      });
    } catch (error) {
      console.error('Error checking password breaches:', error);
      return 0; // Return 0 if check fails
    }
  }
}

module.exports = new PasswordValidationService(); 