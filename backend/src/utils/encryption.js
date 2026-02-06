// Encryption utility for securely storing sensitive data like API keys
const crypto = require('crypto');

// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get encryption key from environment or generate a default one
 * In production, ENCRYPTION_KEY should be set as an environment variable
 */
function getEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (!envKey) {
    console.warn('[Encryption] WARNING: ENCRYPTION_KEY not set in environment. Using SESSION_SECRET as fallback.');
    console.warn('[Encryption] For production, please set a dedicated ENCRYPTION_KEY environment variable.');
    
    // Use SESSION_SECRET as fallback (should exist in production)
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      throw new Error('Neither ENCRYPTION_KEY nor SESSION_SECRET is set. Cannot encrypt sensitive data.');
    }
    
    // Derive a key from SESSION_SECRET
    return crypto.pbkdf2Sync(sessionSecret, 'encryption-key-salt', ITERATIONS, KEY_LENGTH, 'sha256');
  }
  
  // Derive key from ENCRYPTION_KEY
  return crypto.pbkdf2Sync(envKey, 'encryption-key-salt', ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a string value
 * @param {string} text - The text to encrypt
 * @returns {string} - Base64 encoded encrypted data with format: salt:iv:encrypted:tag
 */
function encrypt(text) {
  if (!text) {
    return null;
  }
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    // Combine salt, iv, encrypted data, and tag
    return [
      salt.toString('base64'),
      iv.toString('base64'),
      encrypted,
      tag.toString('base64')
    ].join(':');
  } catch (error) {
    console.error('[Encryption] Error encrypting data:', error.message);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted string
 * @param {string} encryptedData - The encrypted data in format: salt:iv:encrypted:tag
 * @returns {string} - The decrypted text
 */
function decrypt(encryptedData) {
  if (!encryptedData) {
    return null;
  }
  
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [saltBase64, ivBase64, encrypted, tagBase64] = parts;
    
    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Encryption] Error decrypting data:', error.message);
    throw new Error('Failed to decrypt data');
  }
}

module.exports = {
  encrypt,
  decrypt
};
