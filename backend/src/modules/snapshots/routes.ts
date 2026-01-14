import { FastifyPluginAsync } from 'fastify';
import {
  createSnapshotSchema,
  applicationIdParamSchema,
  snapshotIdParamSchema,
} from './schemas.js';
import { createSnapshotFromCv, getSnapshot, deleteSnapshot } from './service.js';
import { ok, created, noContent, fail } from '../../utils/httpResponse.js';

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

        return created(reply, { snapshotId }, 'CV snapshot created successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid request', 'ValidationError');
        }

        if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
          return fail(reply, 404, error.message, 'NotFound');
        }

        fastify.log.error(error);
        return fail(reply, 500, 'Failed to create CV snapshot', 'InternalServerError');
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
          return fail(reply, 404, 'No snapshot found for this application', 'NotFound');
        }

        return ok(reply, snapshot);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid request', 'ValidationError');
        }

        fastify.log.error(error);
        return fail(reply, 500, 'Failed to retrieve CV snapshot', 'InternalServerError');
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
          return fail(reply, 404, 'No snapshot found for this application', 'NotFound');
        }

        await deleteSnapshot(fastify, snapshot.id, userId);

        return noContent(reply);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid request', 'ValidationError');
        }

        fastify.log.error(error);
        return fail(reply, 500, 'Failed to delete CV snapshot', 'InternalServerError');
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

        return ok(reply, snapshot);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid request', 'ValidationError');
        }

        if (error.message?.includes('not found') || error.message?.includes('does not belong')) {
          return fail(reply, 404, error.message, 'NotFound');
        }

        fastify.log.error(error);
        return fail(reply, 500, 'Failed to retrieve CV snapshot', 'InternalServerError');
      }
    },
  });
};

export default snapshotRoutes;
