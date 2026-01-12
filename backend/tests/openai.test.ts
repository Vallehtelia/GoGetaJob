import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('OpenAI API Key Management', () => {
  let app: FastifyInstance;
  let userToken: string;
  let userId: string;

  const testEmail = `test-openai-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123';
  const testApiKey = 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz';

  beforeAll(async () => {
    // Set encryption key for tests
    if (!process.env.GGJ_ENCRYPTION_KEY) {
      const testKey = Buffer.from('0123456789abcdef0123456789abcdef', 'utf8').toString('base64');
      process.env.GGJ_ENCRYPTION_KEY = testKey;
    }

    app = await buildApp();
    await app.ready();

    // Register user
    const userResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });
    const userData = JSON.parse(userResponse.body);
    userToken = userData.accessToken;
    userId = userData.user.id;
  });

  afterAll(async () => {
    try {
      await app.prisma.user.deleteMany({
        where: { email: testEmail },
      });
    } catch (error) {
      // Ignore cleanup errors
    }
    await app.close();
  });

  describe('GET /settings/openai', () => {
    it('should return hasKey=false when no key is saved', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/settings/openai',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.hasKey).toBe(false);
      expect(body.last4).toBeNull();
      expect(body.updatedAt).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/settings/openai',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /settings/openai', () => {
    it('should save OpenAI API key successfully', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/settings/openai',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          apiKey: testApiKey,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('saved successfully');
      expect(body.hasKey).toBe(true);
      expect(body.last4).toBe('wxyz'); // Last 4 chars of test key
    });

    it('should store key encrypted in database', async () => {
      // Get key from database directly
      const stored = await app.prisma.openAiKey.findUnique({
        where: { userId },
      });

      expect(stored).toBeDefined();
      expect(stored?.keyCiphertext).toBeDefined();
      expect(stored?.keyIv).toBeDefined();
      expect(stored?.keyTag).toBeDefined();
      
      // Ciphertext should NOT contain the plaintext key
      expect(stored?.keyCiphertext).not.toContain(testApiKey);
      expect(stored?.keyCiphertext).not.toContain('sk-proj');
    });

    it('should reject invalid API key format', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/settings/openai',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          apiKey: 'invalid-key-format',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('must start with');
    });

    it('should reject short API key', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/settings/openai',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          apiKey: 'sk-short',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('at least 20 characters');
    });

    it('should update existing key', async () => {
      const newApiKey = 'sk-1234567890abcdefghijklmnopqrstuvwxyzABCD';

      const response = await app.inject({
        method: 'PUT',
        url: '/settings/openai',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          apiKey: newApiKey,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.last4).toBe('ABCD'); // New last 4
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/settings/openai',
        payload: {
          apiKey: testApiKey,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /settings/openai (after save)', () => {
    it('should return hasKey=true and last4 after saving', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/settings/openai',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.hasKey).toBe(true);
      expect(body.last4).toBeDefined();
      expect(body.updatedAt).toBeDefined();
      
      // Should NOT return full key
      expect(body).not.toHaveProperty('apiKey');
      expect(body).not.toHaveProperty('keyCiphertext');
    });
  });

  describe('DELETE /settings/openai', () => {
    it('should delete OpenAI API key', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/settings/openai',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('deleted successfully');
      expect(body.hasKey).toBe(false);
    });

    it('should return 404 when no key exists', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/settings/openai',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('No API key found');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/settings/openai',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Cross-user isolation', () => {
    let userBToken: string;

    beforeAll(async () => {
      // Create another user
      const userBEmail = `test-openai-b-${Date.now()}@example.com`;
      const userBResponse = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: userBEmail,
          password: testPassword,
        },
      });
      const userBData = JSON.parse(userBResponse.body);
      userBToken = userBData.accessToken;

      // Save key for user B
      await app.inject({
        method: 'PUT',
        url: '/settings/openai',
        headers: {
          authorization: `Bearer ${userBToken}`,
        },
        payload: {
          apiKey: 'sk-userb-1234567890abcdefghijklmnopqrstuvwxyz',
        },
      });
    });

    it('should not allow user A to see user B key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/settings/openai',
        headers: {
          authorization: `Bearer ${userToken}`, // User A token
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // User A deleted their key earlier, so should be false
      expect(body.hasKey).toBe(false);
    });
  });
});
