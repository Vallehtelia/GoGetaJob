import { FastifyPluginAsync } from 'fastify';
import {
  createApplicationSchema,
  updateApplicationSchema,
  applicationIdParamSchema,
  listApplicationsQuerySchema,
} from './schemas.js';
import { Prisma } from '@prisma/client';
import { ok, created, noContent, fail } from '../../utils/httpResponse.js';

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

        return created(reply, application, 'Application created successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
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

        return ok(reply, {
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
          return fail(reply, 400, 'Invalid query parameters', 'ValidationError');
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
          return fail(reply, 404, 'Application not found', 'NotFound');
        }

        return ok(reply, application);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid application ID', 'ValidationError');
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
          return fail(reply, 404, 'Application not found', 'NotFound');
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

        return ok(reply, application, 'Application updated successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
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
          return fail(reply, 404, 'Application not found', 'NotFound');
        }

        await fastify.prisma.jobApplication.delete({
          where: { id: params.id },
        });

        return noContent(reply);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid application ID', 'ValidationError');
        }
        throw error;
      }
    },
  });
};

export default applicationsRoutes;


