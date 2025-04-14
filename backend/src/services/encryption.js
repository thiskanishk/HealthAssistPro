const crypto = require('crypto');
const config = require('../config');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // for AES-256
    this.ivLength = 16;
    this.saltLength = 64;
    this.tagLength = 16;
    
    // Derive encryption key from environment variable
    const salt = crypto.scryptSync(
      config.encryption.secret,
      'salt',
      this.keyLength
    );
    this.key = Buffer.from(salt);
  }

  // Encrypt sensitive data
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine IV, encrypted data, and auth tag
      return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        tag: tag.toString('hex')
      };
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  // Decrypt sensitive data
  decrypt(encryptedData) {
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  // Hash sensitive identifiers (e.g., SSN, license numbers)
  hash(text) {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');
  }
}

module.exports = new EncryptionService(); 