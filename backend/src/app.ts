import Fastify, { FastifyInstance } from 'fastify';
import { config } from './config/index.js';

// Plugins
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import securityPlugin from './plugins/security.js';

// Routes
import healthRoutes from './modules/health/routes.js';
import authRoutes from './modules/auth/routes.js';
import applicationsRoutes from './modules/applications/routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: config.app.isDevelopment ? 'info' : 'warn',
      transport: config.app.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
  });

  // Register plugins
  await fastify.register(securityPlugin);
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(applicationsRoutes);

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);

    // Handle Fastify HTTP errors
    if (error.statusCode) {
      return reply.code(error.statusCode).send({
        error: error.name,
        message: error.message,
      });
    }

    // Handle Prisma errors
    if (error.constructor.name.includes('Prisma')) {
      return reply.code(500).send({
        error: 'Database Error',
        message: config.app.isDevelopment ? error.message : 'An error occurred with the database',
      });
    }

    // Generic error
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: config.app.isDevelopment ? error.message : 'An unexpected error occurred',
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
    });
  });

  return fastify;
}


