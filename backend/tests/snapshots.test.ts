import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('CV Snapshots', () => {
  let app: FastifyInstance;
  let userToken: string;
  let userId: string;
  let applicationId: string;
  let cvId: string;
  let workId: string;
  let skillId: string;

  const testEmail = `test-snapshots-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123';

  beforeAll(async () => {
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

    // Update profile with some data
    await app.inject({
      method: 'PATCH',
      url: '/profile',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        firstName: 'John',
        lastName: 'Doe',
        headline: 'Software Engineer',
        location: 'San Francisco, CA',
        summary: 'Experienced software engineer',
      },
    });

    // Create library items
    const workResponse = await app.inject({
      method: 'POST',
      url: '/profile/library/work',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        company: 'TechCorp',
        role: 'Senior Engineer',
        startDate: '2020-01-01',
        isCurrent: true,
        description: 'Building great software',
      },
    });
    workId = JSON.parse(workResponse.body).data.id;

    const skillResponse = await app.inject({
      method: 'POST',
      url: '/profile/library/skills',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        name: 'TypeScript',
        level: 'EXPERT',
      },
    });
    skillId = JSON.parse(skillResponse.body).data.id;

    // Create CV
    const cvResponse = await app.inject({
      method: 'POST',
      url: '/cv',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        title: 'My Resume',
      },
    });
    cvId = JSON.parse(cvResponse.body).data.id;

    // Add items to CV
    await app.inject({
      method: 'POST',
      url: `/cv/${cvId}/work`,
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        itemId: workId,
        order: 0,
      },
    });

    await app.inject({
      method: 'POST',
      url: `/cv/${cvId}/skills`,
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        itemId: skillId,
        order: 0,
      },
    });

    // Create application
    const appResponse = await app.inject({
      method: 'POST',
      url: '/applications',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        company: 'Awesome Company',
        position: 'Software Engineer',
        status: 'APPLIED',
      },
    });
    applicationId = JSON.parse(appResponse.body).data.id;
  });

  afterAll(async () => {
    try {
      await app.prisma.user.deleteMany({
        where: {
          email: testEmail,
        },
      });
    } catch (error) {
      // Ignore cleanup errors
    }
    await app.close();
  });

  describe('POST /applications/:id/snapshot', () => {
    it('should create a snapshot for an application', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          cvDocumentId: cvId,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('CV snapshot created successfully');
      expect(body.data.snapshotId).toBeDefined();
    });

    it('should fail with invalid CV document ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          cvDocumentId: 'invalid-uuid',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should fail with non-existent CV document', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'POST',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          cvDocumentId: fakeId,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should fail with non-existent application', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'POST',
        url: `/applications/${fakeId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          cvDocumentId: cvId,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /applications/:id/snapshot', () => {
    it('should retrieve the snapshot for an application', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.title).toContain('My Resume');
      expect(body.data.template).toBe('CLEAN_NAVY');

      // Check header data
      expect(body.data.header).toBeDefined();
      expect(body.data.header.firstName).toBe('John');
      expect(body.data.header.lastName).toBe('Doe');
      expect(body.data.header.headline).toBe('Software Engineer');

      // Check sections
      expect(body.data.workExperiences).toHaveLength(1);
      expect(body.data.workExperiences[0].company).toBe('TechCorp');
      expect(body.data.skills).toHaveLength(1);
      expect(body.data.skills[0].name).toBe('TypeScript');
    });

    it('should return 404 for application without snapshot', async () => {
      // Create new application without snapshot
      const appResponse = await app.inject({
        method: 'POST',
        url: '/applications',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          company: 'Another Company',
          position: 'Developer',
        },
      });
      const newAppId = JSON.parse(appResponse.body).data.id;

      const response = await app.inject({
        method: 'GET',
        url: `/applications/${newAppId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Snapshot Immutability', () => {
    it('should remain unchanged when library item is updated', async () => {
      // Get original snapshot
      const snapshotBefore = await app.inject({
        method: 'GET',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });
      const beforeData = JSON.parse(snapshotBefore.body).data;
      const originalCompany = beforeData.workExperiences[0].company;

      // Update library item
      await app.inject({
        method: 'PATCH',
        url: `/profile/library/work/${workId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          company: 'NewTechCorp',
        },
      });

      // Get snapshot again
      const snapshotAfter = await app.inject({
        method: 'GET',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });
      const afterData = JSON.parse(snapshotAfter.body).data;

      // Snapshot should still have original data
      expect(afterData.workExperiences[0].company).toBe(originalCompany);
      expect(afterData.workExperiences[0].company).not.toBe('NewTechCorp');
    });

    it('should remain unchanged when profile is updated', async () => {
      // Get original snapshot
      const snapshotBefore = await app.inject({
        method: 'GET',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });
      const beforeData = JSON.parse(snapshotBefore.body).data;
      const originalHeadline = beforeData.header.headline;

      // Update profile
      await app.inject({
        method: 'PATCH',
        url: '/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          headline: 'Principal Engineer',
        },
      });

      // Get snapshot again
      const snapshotAfter = await app.inject({
        method: 'GET',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });
      const afterData = JSON.parse(snapshotAfter.body).data;

      // Snapshot should still have original data
      expect(afterData.header.headline).toBe(originalHeadline);
      expect(afterData.header.headline).not.toBe('Principal Engineer');
    });
  });

  describe('Resnapshot (Replace)', () => {
    it('should replace old snapshot when creating a new one', async () => {
      // Create new CV with different content
      const newCvResponse = await app.inject({
        method: 'POST',
        url: '/cv',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          title: 'Updated Resume',
        },
      });
      const newCvId = JSON.parse(newCvResponse.body).data.id;

      // Add only skill (not work) to new CV
      await app.inject({
        method: 'POST',
        url: `/cv/${newCvId}/skills`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          itemId: skillId,
          order: 0,
        },
      });

      // Create new snapshot (should replace old one)
      const createResponse = await app.inject({
        method: 'POST',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          cvDocumentId: newCvId,
        },
      });

      expect(createResponse.statusCode).toBe(201);

      // Get snapshot - should be the new one
      const getResponse = await app.inject({
        method: 'GET',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      const body = JSON.parse(getResponse.body);
      expect(body.data.title).toContain('Updated Resume');
      expect(body.data.workExperiences).toHaveLength(0); // No work in new CV
      expect(body.data.skills).toHaveLength(1);
    });
  });

  describe('DELETE /applications/:id/snapshot', () => {
    it('should delete the snapshot', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('CV snapshot deleted successfully');

      // Verify snapshot is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 when deleting non-existent snapshot', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/applications/${applicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Cross-User Access', () => {
    let userBToken: string;
    let userBApplicationId: string;

    beforeAll(async () => {
      // Create another user
      const userBEmail = `test-snapshots-b-${Date.now()}@example.com`;
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

      // Create application for userB
      const appResponse = await app.inject({
        method: 'POST',
        url: '/applications',
        headers: {
          authorization: `Bearer ${userBToken}`,
        },
        payload: {
          company: 'UserB Company',
          position: 'Developer',
        },
      });
      userBApplicationId = JSON.parse(appResponse.body).data.id;
    });

    it('should block userB from creating snapshot with userA CV', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/applications/${userBApplicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userBToken}`,
        },
        payload: {
          cvDocumentId: cvId, // UserA's CV
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should block userA from accessing userB application snapshot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/applications/${userBApplicationId}/snapshot`,
        headers: {
          authorization: `Bearer ${userToken}`, // UserA token
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
