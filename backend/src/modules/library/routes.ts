import { FastifyPluginAsync } from 'fastify';
import {
  createWorkExperienceSchema,
  updateWorkExperienceSchema,
  workIdParamSchema,
  createEducationSchema,
  updateEducationSchema,
  educationIdParamSchema,
  createSkillSchema,
  updateSkillSchema,
  skillIdParamSchema,
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
} from './schemas.js';
import { ok, created, noContent, fail } from '../../utils/httpResponse.js';

const libraryRoutes: FastifyPluginAsync = async (fastify) => {
  // ============ Work Experience Routes ============

  // List all user's work experiences
  fastify.get('/profile/library/work', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;

      const experiences = await fastify.prisma.userWorkExperience.findMany({
        where: { userId },
        orderBy: [{ startDate: 'desc' }],
      });

      return ok(reply, experiences);
    },
  });

  // Create work experience
  fastify.post('/profile/library/work', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = createWorkExperienceSchema.parse(request.body);

        const experience = await fastify.prisma.userWorkExperience.create({
          data: {
            userId,
            company: body.company,
            role: body.role,
            location: body.location,
            startDate: new Date(body.startDate),
            endDate: body.endDate ? new Date(body.endDate) : null,
            isCurrent: body.isCurrent,
            description: body.description,
          },
        });

        return created(reply, experience, 'Work experience added successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Update work experience
  fastify.patch('/profile/library/work/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = workIdParamSchema.parse(request.params);
        const body = updateWorkExperienceSchema.parse(request.body);

        // Check ownership
        const existing = await fastify.prisma.userWorkExperience.findFirst({
          where: { id: params.id, userId },
        });

        if (!existing) {
          return fail(reply, 404, 'Work experience not found', 'NotFound');
        }

        // Prepare update data
        const updateData: any = {};
        if (body.company !== undefined) updateData.company = body.company;
        if (body.role !== undefined) updateData.role = body.role;
        if (body.location !== undefined) updateData.location = body.location;
        if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
        if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
        if (body.isCurrent !== undefined) updateData.isCurrent = body.isCurrent;
        if (body.description !== undefined) updateData.description = body.description;

        const updated = await fastify.prisma.userWorkExperience.update({
          where: { id: params.id },
          data: updateData,
        });

        return ok(reply, updated, 'Work experience updated successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Delete work experience
  fastify.delete('/profile/library/work/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = workIdParamSchema.parse(request.params);

        // Check ownership
        const existing = await fastify.prisma.userWorkExperience.findFirst({
          where: { id: params.id, userId },
        });

        if (!existing) {
          return fail(reply, 404, 'Work experience not found', 'NotFound');
        }

        await fastify.prisma.userWorkExperience.delete({
          where: { id: params.id },
        });

        return noContent(reply);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid ID', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // ============ Education Routes ============

  // List all user's educations
  fastify.get('/profile/library/education', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;

      const educations = await fastify.prisma.userEducation.findMany({
        where: { userId },
        orderBy: [{ startDate: 'desc' }],
      });

      return ok(reply, educations);
    },
  });

  // Create education
  fastify.post('/profile/library/education', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = createEducationSchema.parse(request.body);

        const education = await fastify.prisma.userEducation.create({
          data: {
            userId,
            school: body.school,
            degree: body.degree,
            field: body.field,
            startDate: body.startDate ? new Date(body.startDate) : null,
            endDate: body.endDate ? new Date(body.endDate) : null,
            description: body.description,
          },
        });

        return created(reply, education, 'Education added successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Update education
  fastify.patch('/profile/library/education/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = educationIdParamSchema.parse(request.params);
        const body = updateEducationSchema.parse(request.body);

        // Check ownership
        const existing = await fastify.prisma.userEducation.findFirst({
          where: { id: params.id, userId },
        });

        if (!existing) {
          return fail(reply, 404, 'Education not found', 'NotFound');
        }

        // Prepare update data
        const updateData: any = {};
        if (body.school !== undefined) updateData.school = body.school;
        if (body.degree !== undefined) updateData.degree = body.degree;
        if (body.field !== undefined) updateData.field = body.field;
        if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
        if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
        if (body.description !== undefined) updateData.description = body.description;

        const updated = await fastify.prisma.userEducation.update({
          where: { id: params.id },
          data: updateData,
        });

        return ok(reply, updated, 'Education updated successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Delete education
  fastify.delete('/profile/library/education/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = educationIdParamSchema.parse(request.params);

        // Check ownership
        const existing = await fastify.prisma.userEducation.findFirst({
          where: { id: params.id, userId },
        });

        if (!existing) {
          return fail(reply, 404, 'Education not found', 'NotFound');
        }

        await fastify.prisma.userEducation.delete({
          where: { id: params.id },
        });

        return noContent(reply);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid ID', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // ============ Skills Routes ============

  // List all user's skills
  fastify.get('/profile/library/skills', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;

      const skills = await fastify.prisma.userSkill.findMany({
        where: { userId },
        orderBy: [{ name: 'asc' }],
      });

      return ok(reply, skills);
    },
  });

  // Create skill
  fastify.post('/profile/library/skills', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = createSkillSchema.parse(request.body);

        const skill = await fastify.prisma.userSkill.create({
          data: {
            userId,
            name: body.name,
            level: body.level,
            category: body.category,
          },
        });

        return created(reply, skill, 'Skill added successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Update skill
  fastify.patch('/profile/library/skills/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = skillIdParamSchema.parse(request.params);
        const body = updateSkillSchema.parse(request.body);

        // Check ownership
        const existing = await fastify.prisma.userSkill.findFirst({
          where: { id: params.id, userId },
        });

        if (!existing) {
          return fail(reply, 404, 'Skill not found', 'NotFound');
        }

        // Prepare update data
        const updateData: any = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.level !== undefined) updateData.level = body.level;
        if (body.category !== undefined) updateData.category = body.category;

        const updated = await fastify.prisma.userSkill.update({
          where: { id: params.id },
          data: updateData,
        });

        return ok(reply, updated, 'Skill updated successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Delete skill
  fastify.delete('/profile/library/skills/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = skillIdParamSchema.parse(request.params);

        // Check ownership
        const existing = await fastify.prisma.userSkill.findFirst({
          where: { id: params.id, userId },
        });

        if (!existing) {
          return fail(reply, 404, 'Skill not found', 'NotFound');
        }

        await fastify.prisma.userSkill.delete({
          where: { id: params.id },
        });

        return noContent(reply);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid ID', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // ============ Projects Routes ============

  // List all user's projects
  fastify.get('/profile/library/projects', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;

      const projects = await fastify.prisma.userProject.findMany({
        where: { userId },
        orderBy: [{ name: 'asc' }],
      });

      return ok(reply, projects);
    },
  });

  // Create project
  fastify.post('/profile/library/projects', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = createProjectSchema.parse(request.body);

        const project = await fastify.prisma.userProject.create({
          data: {
            userId,
            name: body.name,
            description: body.description,
            link: body.link,
            tech: body.tech || [],
          },
        });

        return created(reply, project, 'Project added successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Update project
  fastify.patch('/profile/library/projects/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = projectIdParamSchema.parse(request.params);
        const body = updateProjectSchema.parse(request.body);

        // Check ownership
        const existing = await fastify.prisma.userProject.findFirst({
          where: { id: params.id, userId },
        });

        if (!existing) {
          return fail(reply, 404, 'Project not found', 'NotFound');
        }

        // Prepare update data
        const updateData: any = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.link !== undefined) updateData.link = body.link;
        if (body.tech !== undefined) updateData.tech = body.tech;

        const updated = await fastify.prisma.userProject.update({
          where: { id: params.id },
          data: updateData,
        });

        return ok(reply, updated, 'Project updated successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Delete project
  fastify.delete('/profile/library/projects/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = projectIdParamSchema.parse(request.params);

        // Check ownership
        const existing = await fastify.prisma.userProject.findFirst({
          where: { id: params.id, userId },
        });

        if (!existing) {
          return fail(reply, 404, 'Project not found', 'NotFound');
        }

        await fastify.prisma.userProject.delete({
          where: { id: params.id },
        });

        return noContent(reply);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid ID', 'ValidationError');
        }
        throw error;
      }
    },
  });
};

export default libraryRoutes;
