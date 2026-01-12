import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Experience Library', () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let workId: string;
  let educationId: string;
  let skillId: string;
  let projectId: string;

  const userAEmail = `testA-library-${Date.now()}@example.com`;
  const userBEmail = `testB-library-${Date.now()}@example.com`;
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

  // ============ Work Experience Library Tests ============

  describe('POST /profile/library/work', () => {
    it('should create work experience in library', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/profile/library/work',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          company: 'TechCorp',
          role: 'Senior Software Engineer',
          location: 'San Francisco, CA',
          startDate: '2020-01-01',
          endDate: '2023-12-31',
          isCurrent: false,
          description: 'Led development of cloud infrastructure',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Work experience added successfully');
      expect(body.data.company).toBe('TechCorp');
      expect(body.data.role).toBe('Senior Software Engineer');
      expect(body.data.userId).toBe(userAId);

      workId = body.data.id;
    });

    it('should create current work experience without endDate', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/profile/library/work',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          company: 'CurrentCorp',
          role: 'Tech Lead',
          startDate: '2024-01-01',
          isCurrent: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.isCurrent).toBe(true);
      expect(body.data.endDate).toBeNull();
    });

    it('should fail with invalid date range', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/profile/library/work',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          company: 'TestCorp',
          role: 'Developer',
          startDate: '2023-01-01',
          endDate: '2022-01-01',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /profile/library/work', () => {
    it('should list all work experiences', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/profile/library/work',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should only show user own work experiences', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/profile/library/work',
        headers: {
          authorization: `Bearer ${userBToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBe(0); // UserB has no work experiences
    });
  });

  describe('PATCH /profile/library/work/:id', () => {
    it('should update work experience', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/profile/library/work/${workId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          role: 'Lead Software Engineer',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.role).toBe('Lead Software Engineer');
    });

    it('should block updating other user work experience', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/profile/library/work/${workId}`,
        headers: {
          authorization: `Bearer ${userBToken}`,
        },
        payload: {
          role: 'Hacked Role',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /profile/library/work/:id', () => {
    it('should block deleting other user work experience', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/profile/library/work/${workId}`,
        headers: {
          authorization: `Bearer ${userBToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ============ Education Library Tests ============

  describe('POST /profile/library/education', () => {
    it('should create education in library', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/profile/library/education',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          school: 'Stanford University',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          startDate: '2012-09-01',
          endDate: '2016-06-01',
          description: 'Focus on distributed systems',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.school).toBe('Stanford University');
      expect(body.data.degree).toBe('Bachelor of Science');

      educationId = body.data.id;
    });
  });

  describe('GET /profile/library/education', () => {
    it('should list all educations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/profile/library/education',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /profile/library/education/:id', () => {
    it('should update education', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/profile/library/education/${educationId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          field: 'Computer Science & Mathematics',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.field).toBe('Computer Science & Mathematics');
    });
  });

  // ============ Skills Library Tests ============

  describe('POST /profile/library/skills', () => {
    it('should create skill in library', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/profile/library/skills',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          name: 'TypeScript',
          level: 'ADVANCED',
          category: 'Programming Languages',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('TypeScript');
      expect(body.data.level).toBe('ADVANCED');

      skillId = body.data.id;
    });
  });

  describe('GET /profile/library/skills', () => {
    it('should list all skills', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/profile/library/skills',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /profile/library/skills/:id', () => {
    it('should update skill', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/profile/library/skills/${skillId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          level: 'EXPERT',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.level).toBe('EXPERT');
    });
  });

  // ============ Projects Library Tests ============

  describe('POST /profile/library/projects', () => {
    it('should create project in library', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/profile/library/projects',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          name: 'Open Source Library',
          description: 'A popular TypeScript utility library',
          link: 'https://github.com/example/library',
          tech: ['TypeScript', 'Node.js', 'Jest'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Open Source Library');
      expect(body.data.tech).toEqual(['TypeScript', 'Node.js', 'Jest']);

      projectId = body.data.id;
    });
  });

  describe('GET /profile/library/projects', () => {
    it('should list all projects', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/profile/library/projects',
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /profile/library/projects/:id', () => {
    it('should update project', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/profile/library/projects/${projectId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
        payload: {
          description: 'Updated description',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.description).toBe('Updated description');
    });
  });

  // ============ Cleanup Tests ============

  describe('DELETE library items', () => {
    it('should delete work experience', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/profile/library/work/${workId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should delete education', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/profile/library/education/${educationId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should delete skill', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/profile/library/skills/${skillId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should delete project', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/profile/library/projects/${projectId}`,
        headers: {
          authorization: `Bearer ${userAToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
