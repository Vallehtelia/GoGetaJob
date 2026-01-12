import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('CV Inclusions', () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let cvId: string;
  let workId: string;
  let educationId: string;
  let skillId: string;
  let projectId: string;

  const userAEmail = `testA-cvinc-${Date.now()}@example.com`;
  const userBEmail = `testB-cvinc-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Register two users
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

    // Create CV for userA
    const cvResponse = await app.inject({
      method: 'POST',
      url: '/cv',
      headers: {
        authorization: `Bearer ${userAToken}`,
      },
      payload: {
        title: 'Test CV',
      },
    });
    cvId = JSON.parse(cvResponse.body).data.id;

    // Create library items for userA
    const workResponse = await app.inject({
      method: 'POST',
      url: '/profile/library/work',
      headers: {
        authorization: `Bearer ${userAToken}`,
      },
      payload: {
        company: 'TechCorp',
        role: 'Engineer',
        startDate: '2020-01-01',
      },
    });
    workId = JSON.parse(workResponse.body).data.id;

    const eduResponse = await app.inject({
      method: 'POST',
      url: '/profile/library/education',
      headers: {
        authorization: `Bearer ${userAToken}`,
      },
      payload: {
        school: 'Stanford',
        degree: 'BS',
        field: 'CS',
      },
    });
    educationId = JSON.parse(eduResponse.body).data.id;

    const skillResponse = await app.inject({
      method: 'POST',
      url: '/profile/library/skills',
      headers: {
        authorization: `Bearer ${userAToken}`,
      },
      payload: {
        name: 'TypeScript',
        level: 'ADVANCED',
      },
    });
    skillId = JSON.parse(skillResponse.body).data.id;

    const projectResponse = await app.inject({
      method: 'POST',
      url: '/profile/library/projects',
      headers: {
        authorization: `Bearer ${userAToken}`,
      },
      payload: {
        name: 'My Project',
        tech: ['React', 'Node.js'],
      },
    });
    projectId = JSON.parse(projectResponse.body).data.id;
  });

  afterAll(async () => {
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

  // ============ CV Document Tests ============

  describe('POST /cv', () => {
    it('should create a new CV document', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/cv',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          title: 'Another CV',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.title).toBe('Another CV');
      expect(body.data.isDefault).toBe(false); // Second CV should not be default
    });
  });

  describe('GET /cv/:id', () => {
    it('should get CV with empty sections initially', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/cv/${cvId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe(cvId);
      expect(body.data.workExperiences).toEqual([]);
      expect(body.data.educations).toEqual([]);
      expect(body.data.skills).toEqual([]);
      expect(body.data.projects).toEqual([]);
    });
  });

  // ============ Work Inclusion Tests ============

  describe('POST /cv/:id/work', () => {
    it('should add work experience to CV', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cv/${cvId}/work`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          itemId: workId,
          order: 0,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Work experience added to CV');
    });

    it('should fail adding same work experience twice', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cv/${cvId}/work`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          itemId: workId,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('already');
    });

    it('should fail adding non-existent work experience', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'POST',
        url: `/cv/${cvId}/work`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          itemId: fakeId,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should block adding to other user CV', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cv/${cvId}/work`,
        headers: {
          authorization: `Bearer ${userBToken}`,
        },
        payload: {
          itemId: workId,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /cv/:id (with inclusions)', () => {
    it('should return CV with included work experience', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/cv/${cvId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.workExperiences.length).toBe(1);
      expect(body.data.workExperiences[0].company).toBe('TechCorp');
      expect(body.data.workExperiences[0].inclusionId).toBeDefined();
    });
  });

  describe('DELETE /cv/:id/work/:itemId', () => {
    it('should remove work experience from CV', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/cv/${cvId}/work/${workId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Work experience removed from CV');
    });

    it('should verify work experience removed from CV', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/cv/${cvId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      const body = JSON.parse(response.body);
      expect(body.data.workExperiences.length).toBe(0);
    });

    it('should verify work still exists in library', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/profile/library/work',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      const body = JSON.parse(response.body);
      const work = body.data.find((w: any) => w.id === workId);
      expect(work).toBeDefined();
    });
  });

  // ============ Education Inclusion Tests ============

  describe('POST /cv/:id/education', () => {
    it('should add education to CV', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cv/${cvId}/education`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          itemId: educationId,
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('DELETE /cv/:id/education/:itemId', () => {
    it('should remove education from CV', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/cv/${cvId}/education/${educationId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ============ Skills Inclusion Tests ============

  describe('POST /cv/:id/skills', () => {
    it('should add skill to CV', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cv/${cvId}/skills`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          itemId: skillId,
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('DELETE /cv/:id/skills/:itemId', () => {
    it('should remove skill from CV', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/cv/${cvId}/skills/${skillId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ============ Projects Inclusion Tests ============

  describe('POST /cv/:id/projects', () => {
    it('should add project to CV', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cv/${cvId}/projects`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          itemId: projectId,
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('DELETE /cv/:id/projects/:itemId', () => {
    it('should remove project from CV', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/cv/${cvId}/projects/${projectId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ============ CV Deletion with Cascade Tests ============

  describe('DELETE /cv/:id', () => {
    it('should delete CV and cascade delete inclusions', async () => {
      // Add items back to CV
      await app.inject({
        method: 'POST',
        url: `/cv/${cvId}/work`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: { itemId: workId },
      });

      await app.inject({
        method: 'POST',
        url: `/cv/${cvId}/skills`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: { itemId: skillId },
      });

      // Delete CV
      const response = await app.inject({
        method: 'DELETE',
        url: `/cv/${cvId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify CV is deleted
      const checkCv = await app.inject({
        method: 'GET',
        url: `/cv/${cvId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });
      expect(checkCv.statusCode).toBe(404);

      // Verify library items still exist
      const checkWork = await app.inject({
        method: 'GET',
        url: '/profile/library/work',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });
      const workBody = JSON.parse(checkWork.body);
      expect(workBody.data.some((w: any) => w.id === workId)).toBe(true);
    });
  });

  // ============ Library Item Deletion with CV Impact Tests ============

  describe('DELETE library item used in CV', () => {
    it('should delete library item and cascade delete from CVs', async () => {
      // Create new CV
      const cvResponse = await app.inject({
        method: 'POST',
        url: '/cv',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          title: 'Test CV 2',
        },
      });
      const newCvId = JSON.parse(cvResponse.body).data.id;

      // Create new work experience
      const workResponse = await app.inject({
        method: 'POST',
        url: '/profile/library/work',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          company: 'DeleteTest',
          role: 'Developer',
          startDate: '2020-01-01',
        },
      });
      const newWorkId = JSON.parse(workResponse.body).data.id;

      // Add to CV
      await app.inject({
        method: 'POST',
        url: `/cv/${newCvId}/work`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          itemId: newWorkId,
        },
      });

      // Verify it's in CV
      const checkCv = await app.inject({
        method: 'GET',
        url: `/cv/${newCvId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });
      let cvBody = JSON.parse(checkCv.body);
      expect(cvBody.data.workExperiences.length).toBe(1);

      // Delete from library
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/profile/library/work/${newWorkId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });
      expect(deleteResponse.statusCode).toBe(200);

      // Verify it's removed from CV automatically (cascade)
      const checkCvAgain = await app.inject({
        method: 'GET',
        url: `/cv/${newCvId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });
      cvBody = JSON.parse(checkCvAgain.body);
      expect(cvBody.data.workExperiences.length).toBe(0);
    });
  });

  // ============ Order Tests ============

  describe('PATCH /cv/:id/work/:itemId (order)', () => {
    it('should update work experience order in CV', async () => {
      // Create CV
      const cvResponse = await app.inject({
        method: 'POST',
        url: '/cv',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          title: 'Order Test CV',
        },
      });
      const testCvId = JSON.parse(cvResponse.body).data.id;

      // Create two work experiences
      const work1Response = await app.inject({
        method: 'POST',
        url: '/profile/library/work',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          company: 'Company A',
          role: 'Role A',
          startDate: '2020-01-01',
        },
      });
      const work1Id = JSON.parse(work1Response.body).data.id;

      const work2Response = await app.inject({
        method: 'POST',
        url: '/profile/library/work',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          company: 'Company B',
          role: 'Role B',
          startDate: '2021-01-01',
        },
      });
      const work2Id = JSON.parse(work2Response.body).data.id;

      // Add both to CV
      await app.inject({
        method: 'POST',
        url: `/cv/${testCvId}/work`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          itemId: work1Id,
          order: 1,
        },
      });

      await app.inject({
        method: 'POST',
        url: `/cv/${testCvId}/work`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          itemId: work2Id,
          order: 0,
        },
      });

      // Update order
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/cv/${testCvId}/work/${work1Id}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          order: 0,
        },
      });

      expect(updateResponse.statusCode).toBe(200);
    });
  });

  // ============ Cross-User Access Tests ============

  describe('Cross-user access prevention', () => {
    it('should block adding other user library item to your CV', async () => {
      // Create work for userB
      const workBResponse = await app.inject({
        method: 'POST',
        url: '/profile/library/work',
        headers: {
          authorization: `Bearer ${userBToken}`,
        },
        payload: {
          company: 'UserB Corp',
          role: 'UserB Role',
          startDate: '2020-01-01',
        },
      });
      const workBId = JSON.parse(workBResponse.body).data.id;

      // Try to add UserB's work to UserA's CV
      const response = await app.inject({
        method: 'POST',
        url: `/cv/${cvId}/work`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          itemId: workBId, // UserB's work
        },
      });

      expect(response.statusCode).toBe(404); // Not found because ownership check fails
    });
  });
});
