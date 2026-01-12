import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Auth Flow', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let refreshToken: string;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Cleanup test user
    try {
      await app.prisma.user.deleteMany({
        where: { email: testEmail },
      });
    } catch (error) {
      // Ignore cleanup errors
    }
    await app.close();
  });

  it('GET /health - should return healthy status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.ok).toBe(true);
    expect(body.app).toBe('GoGetaJob');
    expect(body.short).toBe('GGJ');
  });

  it('POST /auth/register - should register a new user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('User registered successfully');
    expect(body.user.email).toBe(testEmail);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();

    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it('POST /auth/register - should fail with duplicate email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.message).toContain('already exists');
  });

  it('POST /auth/login - should login with valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Login successful');
    expect(body.user.email).toBe(testEmail);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it('POST /auth/login - should fail with invalid password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: testEmail,
        password: 'WrongPassword123',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('GET /me - should return current user with valid token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.user.email).toBe(testEmail);
    expect(body.user.id).toBeDefined();
  });

  it('GET /me - should fail without token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/me',
    });

    expect(response.statusCode).toBe(401);
  });

  it('POST /auth/refresh - should refresh tokens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: {
        refreshToken,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Token refreshed successfully');
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    // Refresh token should always be different (single-use tokens)
    expect(body.refreshToken).not.toBe(refreshToken);
  });

  it('POST /auth/refresh - should fail with revoked token', async () => {
    // Try to use the old refresh token (which was revoked)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: {
        refreshToken,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});


