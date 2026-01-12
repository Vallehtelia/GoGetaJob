import { FastifyPluginAsync } from 'fastify';
import {
  createApplicationSchema,
  updateApplicationSchema,
  applicationIdParamSchema,
  listApplicationsQuerySchema,
} from './schemas.js';
import { Prisma } from '@prisma/client';

const applicationsRoutes: FastifyPluginAsync = async (fastify) => {
  // Create application
  fastify.post('/applications', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = createApplicationSchema.parse(request.body);

        const application = await fastify.prisma.jobApplication.create({
          data: {
            userId,
            company: body.company,
            position: body.position,
            link: body.link,
            status: body.status,
            appliedAt: body.appliedAt ? new Date(body.appliedAt) : null,
            lastContactAt: body.lastContactAt ? new Date(body.lastContactAt) : null,
            notes: body.notes,
          },
        });

        return reply.code(201).send({
          message: 'Application created successfully',
          application,
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

  // List applications with filters and pagination
  fastify.get('/applications', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        
        // Parse query params with Zod (handles comma-separated status)
        const query = listApplicationsQuerySchema.parse(request.query);

        // Build where clause
        const where: Prisma.JobApplicationWhereInput = {
          userId,
        };

        // Filter by status
        if (query.status && query.status.length > 0) {
          where.status = { in: query.status as any[] };
        }

        // Search by company or position
        if (query.q) {
          where.OR = [
            { company: { contains: query.q, mode: 'insensitive' } },
            { position: { contains: query.q, mode: 'insensitive' } },
          ];
        }

        // Build orderBy
        const orderBy: Prisma.JobApplicationOrderByWithRelationInput = {
          [query.sort]: query.order,
        };

        // Calculate pagination
        const skip = (query.page - 1) * query.pageSize;
        const take = query.pageSize;

        // Fetch applications and count
        const [applications, total] = await Promise.all([
          fastify.prisma.jobApplication.findMany({
            where,
            orderBy,
            skip,
            take,
          }),
          fastify.prisma.jobApplication.count({ where }),
        ]);

        return reply.send({
          data: applications,
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            totalCount: total,
            totalPages: Math.ceil(total / query.pageSize),
          },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid query parameters',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Get single application by ID
  fastify.get('/applications/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = applicationIdParamSchema.parse(request.params);

        const application = await fastify.prisma.jobApplication.findFirst({
          where: {
            id: params.id,
            userId, // Ensure user owns this application
          },
        });

        if (!application) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Application not found',
          });
        }

        return reply.send(application);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid application ID',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Update application
  fastify.patch('/applications/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = applicationIdParamSchema.parse(request.params);
        const body = updateApplicationSchema.parse(request.body);

        // Check if application exists and belongs to user
        const existing = await fastify.prisma.jobApplication.findFirst({
          where: {
            id: params.id,
            userId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Application not found',
          });
        }

        // Prepare update data
        const updateData: any = {};
        if (body.company !== undefined) updateData.company = body.company;
        if (body.position !== undefined) updateData.position = body.position;
        if (body.link !== undefined) updateData.link = body.link;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.appliedAt !== undefined) {
          updateData.appliedAt = body.appliedAt ? new Date(body.appliedAt) : null;
        }
        if (body.lastContactAt !== undefined) {
          updateData.lastContactAt = body.lastContactAt ? new Date(body.lastContactAt) : null;
        }
        if (body.notes !== undefined) updateData.notes = body.notes;

        const application = await fastify.prisma.jobApplication.update({
          where: { id: params.id },
          data: updateData,
        });

        return reply.send({
          message: 'Application updated successfully',
          application,
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

  // Delete application
  fastify.delete('/applications/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = applicationIdParamSchema.parse(request.params);

        // Check if application exists and belongs to user
        const existing = await fastify.prisma.jobApplication.findFirst({
          where: {
            id: params.id,
            userId,
          },
        });

        if (!existing) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Application not found',
          });
        }

        await fastify.prisma.jobApplication.delete({
          where: { id: params.id },
        });

        return reply.code(200).send({
          message: 'Application deleted successfully',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid application ID',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });
};

export default applicationsRoutes;


