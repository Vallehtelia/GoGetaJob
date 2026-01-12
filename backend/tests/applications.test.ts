import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Job Applications', () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let applicationId: string;

  const userAEmail = `testA-${Date.now()}@example.com`;
  const userBEmail = `testB-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Register two users for cross-user tests
    const userAResponse = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: userAEmail,
        password: testPassword,
      },
    });
    const userAData = JSON.parse(userAResponse.body);
    userAToken = userAData.accessToken;
    userAId = userAData.user.id;

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
    userBId = userBData.user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await app.prisma.user.deleteMany({
        where: {
          email: { in: [userAEmail, userBEmail] },
        },
      });
    } catch (error) {
      // Ignore cleanup errors
    }
    await app.close();
  });

  describe('POST /applications', () => {
    it('should create a new application', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/applications',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          company: 'TechCorp',
          position: 'Software Engineer',
          link: 'https://techcorp.com/jobs/123',
          status: 'APPLIED',
          appliedAt: new Date().toISOString(),
          notes: 'Great opportunity',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Application created successfully');
      expect(body.application.company).toBe('TechCorp');
      expect(body.application.position).toBe('Software Engineer');
      expect(body.application.userId).toBe(userAId);

      applicationId = body.application.id;
    });

    it('should fail without authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/applications',
        payload: {
          company: 'TestCorp',
          position: 'Test Position',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should fail with invalid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/applications',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          // Missing required fields
          company: '',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should fail with invalid URL', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/applications',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          company: 'TestCorp',
          position: 'Test Position',
          link: 'not-a-url',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation Error');
    });
  });

  describe('GET /applications/:id', () => {
    it('should get application by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/applications/${applicationId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(applicationId);
      expect(body.company).toBe('TechCorp');
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'GET',
        url: `/applications/${fakeId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should prevent cross-user access', async () => {
      // User B tries to access User A's application
      const response = await app.inject({
        method: 'GET',
        url: `/applications/${applicationId}`,
        headers: {
          authorization: `Bearer ${userBToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /applications/:id', () => {
    it('should update application', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/applications/${applicationId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          status: 'INTERVIEW',
          notes: 'First interview scheduled',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Application updated successfully');
      expect(body.application.status).toBe('INTERVIEW');
      expect(body.application.notes).toBe('First interview scheduled');
    });

    it('should prevent cross-user update', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/applications/${applicationId}`,
        headers: {
          authorization: `Bearer ${userBToken}`,
        },
        payload: {
          status: 'REJECTED',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /applications', () => {
    beforeAll(async () => {
      // Create multiple applications for testing pagination and filtering
      const applications = [
        { company: 'StartupXYZ', position: 'Full Stack Developer', status: 'APPLIED' },
        { company: 'BigTech Inc', position: 'Backend Engineer', status: 'INTERVIEW' },
        { company: 'Design Co', position: 'Frontend Developer', status: 'OFFER' },
        { company: 'Finance Corp', position: 'DevOps Engineer', status: 'REJECTED' },
        { company: 'Healthcare Tech', position: 'Senior Developer', status: 'APPLIED' },
      ];

      for (const appData of applications) {
        await app.inject({
          method: 'POST',
          url: '/applications',
          headers: {
            authorization: `Bearer ${userAToken}`,
          },
          payload: appData,
        });
      }

      // Create an application for User B
      await app.inject({
        method: 'POST',
        url: '/applications',
        headers: {
          authorization: `Bearer ${userBToken}`,
        },
        payload: {
          company: 'User B Company',
          position: 'Test Position',
          status: 'APPLIED',
        },
      });
    });

    it('should list all applications for user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/applications',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.pagination.totalCount).toBeGreaterThanOrEqual(body.data.length);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.pageSize).toBe(20);
      // Verify user isolation - should not see User B's applications
      expect(body.data.every((app: any) => app.userId === userAId)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/applications?status=INTERVIEW',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.every((app: any) => app.status === 'INTERVIEW')).toBe(true);
    });

    it('should filter by multiple statuses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/applications?status=APPLIED,INTERVIEW',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(
        body.data.every((app: any) => app.status === 'APPLIED' || app.status === 'INTERVIEW')
      ).toBe(true);
    });

    it('should search by company name', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/applications?q=Tech',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThan(0);
      expect(
        body.data.every(
          (app: any) =>
            app.company.toLowerCase().includes('tech') ||
            app.position.toLowerCase().includes('tech')
        )
      ).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/applications?page=1&pageSize=2',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeLessThanOrEqual(2);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.pageSize).toBe(2);
      expect(body.pagination.totalPages).toBeGreaterThan(0);
    });

    it('should support sorting', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/applications?sort=createdAt&order=asc',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // Verify items are sorted in ascending order
      if (body.data.length > 1) {
        const dates = body.data.map((app: any) => new Date(app.createdAt).getTime());
        const sortedDates = [...dates].sort((a, b) => a - b);
        expect(dates).toEqual(sortedDates);
      }
    });

    it('should enforce max page size', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/applications?pageSize=200', // Exceeds max of 100
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pagination.pageSize).toBe(100); // Should be capped at 100
    });
  });

  describe('DELETE /applications/:id', () => {
    it('should delete application', async () => {
      // Create a new application to delete
      const createResponse = await app.inject({
        method: 'POST',
        url: '/applications',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          company: 'ToDelete Corp',
          position: 'Test Position',
        },
      });
      const createdApp = JSON.parse(createResponse.body).application;

      // Delete it
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/applications/${createdApp.id}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(deleteResponse.statusCode).toBe(200);
      const body = JSON.parse(deleteResponse.body);
      expect(body.message).toBe('Application deleted successfully');

      // Verify it's deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/applications/${createdApp.id}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });
      expect(getResponse.statusCode).toBe(404);
    });

    it('should prevent cross-user delete', async () => {
      // User B tries to delete User A's application
      const response = await app.inject({
        method: 'DELETE',
        url: `/applications/${applicationId}`,
        headers: {
          authorization: `Bearer ${userBToken}`,
        },
      });

      expect(response.statusCode).toBe(404);

      // Verify application still exists for User A
      const getResponse = await app.inject({
        method: 'GET',
        url: `/applications/${applicationId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });
      expect(getResponse.statusCode).toBe(200);
    });
  });
});


