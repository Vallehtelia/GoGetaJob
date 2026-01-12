// Profile integration tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Profile API', () => {
  let app: FastifyInstance;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Register a test user
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `profile-test-${Date.now()}@example.com`,
        password: 'TestPass123',
      },
    });

    const registerData = JSON.parse(registerResponse.body);
    accessToken = registerData.accessToken;
    userId = registerData.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /profile', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/profile',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return user profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.profile).toBeDefined();
      expect(data.profile.id).toBe(userId);
      expect(data.profile.email).toContain('profile-test');
      expect(data.profile.firstName).toBeNull();
      expect(data.profile.lastName).toBeNull();
    });
  });

  describe('PATCH /profile', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/profile',
        payload: { firstName: 'John' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should update profile fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+358401234567',
          location: 'Helsinki, Finland',
          headline: 'Full Stack Developer',
          summary: 'Passionate about building great software.',
          linkedinUrl: 'https://linkedin.com/in/johndoe',
          githubUrl: 'https://github.com/johndoe',
          websiteUrl: 'https://johndoe.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.profile.firstName).toBe('John');
      expect(data.profile.lastName).toBe('Doe');
      expect(data.profile.phone).toBe('+358401234567');
      expect(data.profile.location).toBe('Helsinki, Finland');
      expect(data.profile.headline).toBe('Full Stack Developer');
      expect(data.profile.summary).toBe('Passionate about building great software.');
      expect(data.profile.linkedinUrl).toBe('https://linkedin.com/in/johndoe');
      expect(data.profile.githubUrl).toBe('https://github.com/johndoe');
      expect(data.profile.websiteUrl).toBe('https://johndoe.com');
    });

    it('should return updated profile on subsequent GET', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.profile.firstName).toBe('John');
      expect(data.profile.lastName).toBe('Doe');
    });

    it('should reject invalid URL', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          linkedinUrl: 'not-a-valid-url',
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toBe('Validation Error');
    });

    it('should reject too-long summary', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          summary: 'a'.repeat(2001), // 2001 characters
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error).toBe('Validation Error');
    });

    it('should accept null values to clear fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          headline: null,
          summary: null,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.profile.headline).toBeNull();
      expect(data.profile.summary).toBeNull();
    });

    it('should accept empty string for URLs (clears field)', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/profile',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        payload: {
          linkedinUrl: '',
          githubUrl: '',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.profile.linkedinUrl).toBeNull();
      expect(data.profile.githubUrl).toBeNull();
    });
  });
});
