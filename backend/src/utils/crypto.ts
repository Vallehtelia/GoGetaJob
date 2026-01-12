import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes for GCM

/**
 * Get encryption key from environment
 * Must be a base64-encoded 32-byte key
 */
function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.GGJ_ENCRYPTION_KEY;
  
  if (!keyBase64) {
    throw new Error('GGJ_ENCRYPTION_KEY environment variable is required for encryption');
  }

  const key = Buffer.from(keyBase64, 'base64');
  
  if (key.length !== 32) {
    throw new Error('GGJ_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }

  return key;
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns ciphertext, IV, and authentication tag (all base64-encoded)
 */
export function encryptString(plaintext: string): {
  ciphertext: string;
  iv: string;
  tag: string;
} {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  } catch (error: any) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a string using AES-256-GCM
 * Requires ciphertext, IV, and authentication tag (all base64-encoded)
 */
export function decryptString(
  ciphertext: string,
  iv: string,
  tag: string
): string {
  try {
    const key = getEncryptionKey();
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
    decipher.setAuthTag(tagBuffer);
    
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Get last N characters of a string (for display purposes)
 * Used to show "****1234" without exposing full key
 */
export function getLastChars(str: string, count: number = 4): string {
  if (!str || str.length < count) {
    return str;
  }
  return str.slice(-count);
}
