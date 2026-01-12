// Profile routes

import type { FastifyInstance } from 'fastify';
import { updateProfileSchema } from './schemas.js';

export default async function profileRoutes(fastify: FastifyInstance) {
  // Get current user's profile
  fastify.get('/profile', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;

        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            location: true,
            headline: true,
            summary: true,
            linkedinUrl: true,
            githubUrl: true,
            websiteUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }

        return reply.send({ profile: user });
      } catch (error: any) {
        fastify.log.error(error);
        throw error;
      }
    },
  });

  // Update current user's profile
  fastify.patch('/profile', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const updates = updateProfileSchema.parse(request.body);

        // Update user profile
        const updatedUser = await fastify.prisma.user.update({
          where: { id: userId },
          data: updates,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            location: true,
            headline: true,
            summary: true,
            linkedinUrl: true,
            githubUrl: true,
            websiteUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return reply.send({ profile: updatedUser });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        fastify.log.error(error);
        throw error;
      }
    },
  });
}
