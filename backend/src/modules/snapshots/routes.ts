import { FastifyPluginAsync } from 'fastify';
import {
  createSnapshotSchema,
  applicationIdParamSchema,
  snapshotIdParamSchema,
} from './schemas.js';
import { createSnapshotFromCv, getSnapshot, deleteSnapshot } from './service.js';

const snapshotRoutes: FastifyPluginAsync = async (fastify) => {
  // Create snapshot for an application
  fastify.post('/applications/:id/snapshot', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = applicationIdParamSchema.parse(request.params);
        const body = createSnapshotSchema.parse(request.body);

        const snapshotId = await createSnapshotFromCv(
          fastify,
          userId,
          body.cvDocumentId,
          params.id
        );

        return reply.code(201).send({
          message: 'CV snapshot created successfully',
          data: { snapshotId },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Validation Error',
            message: error.errors.map((e: any) => e.message).join(', '),
          });
        }

        if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: error.message,
          });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to create CV snapshot',
        });
      }
    },
  });

  // Get snapshot for an application
  fastify.get('/applications/:id/snapshot', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = applicationIdParamSchema.parse(request.params);

        // Find the snapshot linked to this application
        const snapshot = await fastify.prisma.cvSnapshot.findFirst({
          where: {
            applicationId: params.id,
            userId,
          },
          include: {
            header: true,
            workExperiences: {
              orderBy: { order: 'asc' },
            },
            educations: {
              orderBy: { order: 'asc' },
            },
            skills: {
              orderBy: { order: 'asc' },
            },
            projects: {
              orderBy: { order: 'asc' },
            },
          },
        });

        if (!snapshot) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'No snapshot found for this application',
          });
        }

        return reply.send({
          data: snapshot,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Validation Error',
            message: error.errors.map((e: any) => e.message).join(', '),
          });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to retrieve CV snapshot',
        });
      }
    },
  });

  // Delete snapshot for an application
  fastify.delete('/applications/:id/snapshot', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = applicationIdParamSchema.parse(request.params);

        // Find the snapshot linked to this application
        const snapshot = await fastify.prisma.cvSnapshot.findFirst({
          where: {
            applicationId: params.id,
            userId,
          },
        });

        if (!snapshot) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'No snapshot found for this application',
          });
        }

        await deleteSnapshot(fastify, snapshot.id, userId);

        return reply.send({
          message: 'CV snapshot deleted successfully',
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Validation Error',
            message: error.errors.map((e: any) => e.message).join(', '),
          });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to delete CV snapshot',
        });
      }
    },
  });

  // Optional: Get snapshot by ID directly
  fastify.get('/snapshots/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const params = snapshotIdParamSchema.parse(request.params);

        const snapshot = await getSnapshot(fastify, params.id, userId);

        return reply.send({
          data: snapshot,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Validation Error',
            message: error.errors.map((e: any) => e.message).join(', '),
          });
        }

        if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: error.message,
          });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to retrieve CV snapshot',
        });
      }
    },
  });
};

export default snapshotRoutes;
