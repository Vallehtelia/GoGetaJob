import { describe, it, expect, beforeAll } from 'vitest';
import { encryptString, decryptString, getLastChars } from '../src/utils/crypto.js';

describe('Crypto Utils', () => {
  beforeAll(() => {
    // Set encryption key for tests
    if (!process.env.GGJ_ENCRYPTION_KEY) {
      // 32-byte key for AES-256
      const testKey = Buffer.from('0123456789abcdef0123456789abcdef', 'utf8').toString('base64');
      process.env.GGJ_ENCRYPTION_KEY = testKey;
    }
  });

  describe('encryptString / decryptString', () => {
    it('should encrypt and decrypt a string successfully', () => {
      const plaintext = 'Hello, World!';
      
      const encrypted = encryptString(plaintext);
      
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      
      const decrypted = decryptString(encrypted.ciphertext, encrypted.iv, encrypted.tag);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt OpenAI API key format', () => {
      const apiKey = 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz';
      
      const encrypted = encryptString(apiKey);
      const decrypted = decryptString(encrypted.ciphertext, encrypted.iv, encrypted.tag);
      
      expect(decrypted).toBe(apiKey);
    });

    it('should produce different ciphertexts for same input (random IV)', () => {
      const plaintext = 'test message';
      
      const encrypted1 = encryptString(plaintext);
      const encrypted2 = encryptString(plaintext);
      
      // Different IVs should produce different ciphertexts
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      // But both should decrypt to same plaintext
      const decrypted1 = decryptString(encrypted1.ciphertext, encrypted1.iv, encrypted1.tag);
      const decrypted2 = decryptString(encrypted2.ciphertext, encrypted2.iv, encrypted2.tag);
      
      expect(decrypted1).toBe(plaintext);
      expect(decrypted2).toBe(plaintext);
    });

    it('should fail to decrypt with wrong tag', () => {
      const plaintext = 'secret data';
      const encrypted = encryptString(plaintext);
      
      const wrongTag = Buffer.from('0000000000000000', 'utf8').toString('base64');
      
      expect(() => {
        decryptString(encrypted.ciphertext, encrypted.iv, wrongTag);
      }).toThrow();
    });

    it('should fail to decrypt with wrong IV', () => {
      const plaintext = 'secret data';
      const encrypted = encryptString(plaintext);
      
      const wrongIv = Buffer.from('000000000000', 'utf8').toString('base64');
      
      expect(() => {
        decryptString(encrypted.ciphertext, wrongIv, encrypted.tag);
      }).toThrow();
    });
  });

  describe('getLastChars', () => {
    it('should return last 4 characters by default', () => {
      const str = 'sk-1234567890abcdef';
      expect(getLastChars(str)).toBe('cdef');
    });

    it('should return custom number of characters', () => {
      const str = 'test-api-key-abcd1234';
      expect(getLastChars(str, 8)).toBe('abcd1234');
    });

    it('should return full string if shorter than count', () => {
      const str = 'abc';
      expect(getLastChars(str, 10)).toBe('abc');
    });

    it('should handle empty string', () => {
      expect(getLastChars('', 4)).toBe('');
    });
  });
});
