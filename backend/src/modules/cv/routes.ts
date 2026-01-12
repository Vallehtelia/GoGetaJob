import { FastifyPluginAsync } from 'fastify';
import {
  createCvDocumentSchema,
  updateCvDocumentSchema,
  cvIdParamSchema,
  addInclusionSchema,
  updateInclusionOrderSchema,
  inclusionIdParamSchema,
} from './schemas.js';

const cvRoutes: FastifyPluginAsync = async (fastify) => {
  // ============ CV Document Routes ============

  // List all CV documents for the user
  fastify.get('/cv', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;

      const cvs = await fastify.prisma.cvDocument.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          isDefault: true,
          template: true,
          updatedAt: true,
        },
        orderBy: [
          { isDefault: 'desc' },
          { updatedAt: 'desc' },
        ],
      });

      return reply.send({ data: cvs });
    },
  });

  // Create a new CV document
  fastify.post('/cv', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = createCvDocumentSchema.parse(request.body);

        // Check if user has any CVs yet
        const existingCvsCount = await fastify.prisma.cvDocument.count({
          where: { userId },
        });

        // First CV is default by default
        const isDefault = existingCvsCount === 0;

        const cv = await fastify.prisma.cvDocument.create({
          data: {
            userId,
            title: body.title || 'Main CV',
            template: body.template,
            isDefault,
          },
        });

        return reply.code(201).send({
          message: 'CV created successfully',
          data: cv,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Get single CV with all included sections
  fastify.get('/cv/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = cvIdParamSchema.parse(request.params);

        const cv = await fastify.prisma.cvDocument.findFirst({
          where: {
            id: params.id,
            userId,
          },
          include: {
            workInclusions: {
              include: {
                workExperience: true,
              },
              orderBy: [{ order: 'asc' }],
            },
            educationInclusions: {
              include: {
                education: true,
              },
              orderBy: [{ order: 'asc' }],
            },
            skillInclusions: {
              include: {
                skill: true,
              },
              orderBy: [{ order: 'asc' }],
            },
            projectInclusions: {
              include: {
                project: true,
              },
              orderBy: [{ order: 'asc' }],
            },
          },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        // Transform to flatten the inclusions
        const response = {
          id: cv.id,
          userId: cv.userId,
          title: cv.title,
          isDefault: cv.isDefault,
          template: cv.template,
          createdAt: cv.createdAt,
          updatedAt: cv.updatedAt,
          workExperiences: cv.workInclusions.map((inc) => ({
            ...inc.workExperience,
            inclusionId: inc.id,
            order: inc.order,
          })),
          educations: cv.educationInclusions.map((inc) => ({
            ...inc.education,
            inclusionId: inc.id,
            order: inc.order,
          })),
          skills: cv.skillInclusions.map((inc) => ({
            ...inc.skill,
            inclusionId: inc.id,
            order: inc.order,
          })),
          projects: cv.projectInclusions.map((inc) => ({
            ...inc.project,
            inclusionId: inc.id,
            order: inc.order,
          })),
        };

        return reply.send({ data: response });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid CV ID',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Update CV document
  fastify.patch('/cv/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = cvIdParamSchema.parse(request.params);
        const body = updateCvDocumentSchema.parse(request.body);

        // Check if CV exists and belongs to user
        const existing = await fastify.prisma.cvDocument.findFirst({
          where: {
            id: params.id,
            userId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        // If setting as default, unset other defaults for this user
        if (body.isDefault === true) {
          await fastify.prisma.cvDocument.updateMany({
            where: {
              userId,
              id: { not: params.id },
            },
            data: {
              isDefault: false,
            },
          });
        }

        // Prepare update data
        const updateData: any = {};
        if (body.title !== undefined) updateData.title = body.title;
        if (body.template !== undefined) updateData.template = body.template;
        if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;

        const cv = await fastify.prisma.cvDocument.update({
          where: { id: params.id },
          data: updateData,
        });

        return reply.send({
          message: 'CV updated successfully',
          data: cv,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Delete CV document
  fastify.delete('/cv/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = cvIdParamSchema.parse(request.params);

        // Check if CV exists and belongs to user
        const existing = await fastify.prisma.cvDocument.findFirst({
          where: {
            id: params.id,
            userId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        await fastify.prisma.cvDocument.delete({
          where: { id: params.id },
        });

        return reply.code(200).send({
          message: 'CV deleted successfully',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid CV ID',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // ============ Work Experience Inclusion Routes ============

  // Add work experience to CV
  fastify.post('/cv/:id/work', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = cvIdParamSchema.parse(request.params);
        const body = addInclusionSchema.parse(request.body);

        // Verify CV ownership
        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: params.id, userId },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        // Verify work experience ownership
        const workExp = await fastify.prisma.userWorkExperience.findFirst({
          where: { id: body.itemId, userId },
        });

        if (!workExp) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Work experience not found',
          });
        }

        // Check if already included
        const existing = await fastify.prisma.cvWorkInclusion.findUnique({
          where: {
            cvId_workExperienceId: {
              cvId: params.id,
              workExperienceId: body.itemId,
            },
          },
        });

        if (existing) {
          return reply.code(400).send({
            error: 'Already Exists',
            message: 'This work experience is already in this CV',
          });
        }

        const inclusion = await fastify.prisma.cvWorkInclusion.create({
          data: {
            cvId: params.id,
            workExperienceId: body.itemId,
            order: body.order,
          },
          include: {
            workExperience: true,
          },
        });

        return reply.code(201).send({
          message: 'Work experience added to CV',
          data: inclusion,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Remove work experience from CV
  fastify.delete('/cv/:id/work/:itemId', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = inclusionIdParamSchema.parse(request.params);

        // Verify CV ownership
        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: params.id, userId },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        // Delete inclusion
        const deleted = await fastify.prisma.cvWorkInclusion.deleteMany({
          where: {
            cvId: params.id,
            workExperienceId: params.itemId,
          },
        });

        if (deleted.count === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Work experience not in this CV',
          });
        }

        return reply.code(200).send({
          message: 'Work experience removed from CV',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid ID',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Update work experience order in CV
  fastify.patch('/cv/:id/work/:itemId', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = inclusionIdParamSchema.parse(request.params);
        const body = updateInclusionOrderSchema.parse(request.body);

        // Verify CV ownership
        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: params.id, userId },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        // Update order
        const updated = await fastify.prisma.cvWorkInclusion.updateMany({
          where: {
            cvId: params.id,
            workExperienceId: params.itemId,
          },
          data: {
            order: body.order,
          },
        });

        if (updated.count === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Work experience not in this CV',
          });
        }

        return reply.send({
          message: 'Order updated successfully',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // ============ Education Inclusion Routes ============

  // Add education to CV
  fastify.post('/cv/:id/education', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = cvIdParamSchema.parse(request.params);
        const body = addInclusionSchema.parse(request.body);

        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: params.id, userId },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        const education = await fastify.prisma.userEducation.findFirst({
          where: { id: body.itemId, userId },
        });

        if (!education) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Education not found',
          });
        }

        const existing = await fastify.prisma.cvEducationInclusion.findUnique({
          where: {
            cvId_educationId: {
              cvId: params.id,
              educationId: body.itemId,
            },
          },
        });

        if (existing) {
          return reply.code(400).send({
            error: 'Already Exists',
            message: 'This education is already in this CV',
          });
        }

        const inclusion = await fastify.prisma.cvEducationInclusion.create({
          data: {
            cvId: params.id,
            educationId: body.itemId,
            order: body.order,
          },
          include: {
            education: true,
          },
        });

        return reply.code(201).send({
          message: 'Education added to CV',
          data: inclusion,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Remove education from CV
  fastify.delete('/cv/:id/education/:itemId', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = inclusionIdParamSchema.parse(request.params);

        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: params.id, userId },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        const deleted = await fastify.prisma.cvEducationInclusion.deleteMany({
          where: {
            cvId: params.id,
            educationId: params.itemId,
          },
        });

        if (deleted.count === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Education not in this CV',
          });
        }

        return reply.code(200).send({
          message: 'Education removed from CV',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid ID',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Update education order
  fastify.patch('/cv/:id/education/:itemId', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = inclusionIdParamSchema.parse(request.params);
        const body = updateInclusionOrderSchema.parse(request.body);

        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: params.id, userId },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        const updated = await fastify.prisma.cvEducationInclusion.updateMany({
          where: {
            cvId: params.id,
            educationId: params.itemId,
          },
          data: {
            order: body.order,
          },
        });

        if (updated.count === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Education not in this CV',
          });
        }

        return reply.send({
          message: 'Order updated successfully',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // ============ Skill Inclusion Routes ============

  // Add skill to CV
  fastify.post('/cv/:id/skills', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = cvIdParamSchema.parse(request.params);
        const body = addInclusionSchema.parse(request.body);

        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: params.id, userId },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        const skill = await fastify.prisma.userSkill.findFirst({
          where: { id: body.itemId, userId },
        });

        if (!skill) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Skill not found',
          });
        }

        const existing = await fastify.prisma.cvSkillInclusion.findUnique({
          where: {
            cvId_skillId: {
              cvId: params.id,
              skillId: body.itemId,
            },
          },
        });

        if (existing) {
          return reply.code(400).send({
            error: 'Already Exists',
            message: 'This skill is already in this CV',
          });
        }

        const inclusion = await fastify.prisma.cvSkillInclusion.create({
          data: {
            cvId: params.id,
            skillId: body.itemId,
            order: body.order,
          },
          include: {
            skill: true,
          },
        });

        return reply.code(201).send({
          message: 'Skill added to CV',
          data: inclusion,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Remove skill from CV
  fastify.delete('/cv/:id/skills/:itemId', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = inclusionIdParamSchema.parse(request.params);

        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: params.id, userId },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        const deleted = await fastify.prisma.cvSkillInclusion.deleteMany({
          where: {
            cvId: params.id,
            skillId: params.itemId,
          },
        });

        if (deleted.count === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Skill not in this CV',
          });
        }

        return reply.code(200).send({
          message: 'Skill removed from CV',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid ID',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Update skill order
  fastify.patch('/cv/:id/skills/:itemId', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = inclusionIdParamSchema.parse(request.params);
        const body = updateInclusionOrderSchema.parse(request.body);

        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: params.id, userId },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        const updated = await fastify.prisma.cvSkillInclusion.updateMany({
          where: {
            cvId: params.id,
            skillId: params.itemId,
          },
          data: {
            order: body.order,
          },
        });

        if (updated.count === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Skill not in this CV',
          });
        }

        return reply.send({
          message: 'Order updated successfully',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // ============ Project Inclusion Routes ============

  // Add project to CV
  fastify.post('/cv/:id/projects', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = cvIdParamSchema.parse(request.params);
        const body = addInclusionSchema.parse(request.body);

        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: params.id, userId },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        const project = await fastify.prisma.userProject.findFirst({
          where: { id: body.itemId, userId },
        });

        if (!project) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Project not found',
          });
        }

        const existing = await fastify.prisma.cvProjectInclusion.findUnique({
          where: {
            cvId_projectId: {
              cvId: params.id,
              projectId: body.itemId,
            },
          },
        });

        if (existing) {
          return reply.code(400).send({
            error: 'Already Exists',
            message: 'This project is already in this CV',
          });
        }

        const inclusion = await fastify.prisma.cvProjectInclusion.create({
          data: {
            cvId: params.id,
            projectId: body.itemId,
            order: body.order,
          },
          include: {
            project: true,
          },
        });

        return reply.code(201).send({
          message: 'Project added to CV',
          data: inclusion,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Remove project from CV
  fastify.delete('/cv/:id/projects/:itemId', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = inclusionIdParamSchema.parse(request.params);

        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: params.id, userId },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        const deleted = await fastify.prisma.cvProjectInclusion.deleteMany({
          where: {
            cvId: params.id,
            projectId: params.itemId,
          },
        });

        if (deleted.count === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Project not in this CV',
          });
        }

        return reply.code(200).send({
          message: 'Project removed from CV',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid ID',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Update project order
  fastify.patch('/cv/:id/projects/:itemId', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = inclusionIdParamSchema.parse(request.params);
        const body = updateInclusionOrderSchema.parse(request.body);

        const cv = await fastify.prisma.cvDocument.findFirst({
          where: { id: params.id, userId },
        });

        if (!cv) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'CV not found',
          });
        }

        const updated = await fastify.prisma.cvProjectInclusion.updateMany({
          where: {
            cvId: params.id,
            projectId: params.itemId,
          },
          data: {
            order: body.order,
          },
        });

        if (updated.count === 0) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Project not in this CV',
          });
        }

        return reply.send({
          message: 'Order updated successfully',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });
};

export default cvRoutes;
