import Fastify, { FastifyInstance } from 'fastify';
import { config } from './config/index.js';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { fail } from './utils/httpResponse.js';

// Plugins
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import securityPlugin from './plugins/security.js';
import fileUploadPlugin from './plugins/fileUpload.js';

// Routes
import healthRoutes from './modules/health/routes.js';
import authRoutes from './modules/auth/routes.js';
import applicationsRoutes from './modules/applications/routes.js';
import profileRoutes from './modules/profile/routes.js';
import cvRoutes from './modules/cv/routes.js';
import libraryRoutes from './modules/library/routes.js';
import snapshotRoutes from './modules/snapshots/routes.js';
import openaiRoutes from './modules/openai/routes.js';
import aiRoutes from './modules/ai/routes.js';
import accountRoutes from './modules/account/routes.js';
import feedbackRoutes from './modules/feedback/routes.js';
import adminFeedbackRoutes from './modules/admin/feedback/routes.js';
import analyticsRoutes from './modules/analytics/routes.js';
import adminAnalyticsRoutes from './modules/admin/analytics/routes.js';

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
  await fastify.register(fileUploadPlugin);
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(applicationsRoutes);
  await fastify.register(profileRoutes);
  await fastify.register(libraryRoutes);
  await fastify.register(cvRoutes);
  await fastify.register(snapshotRoutes);
  await fastify.register(openaiRoutes);
  await fastify.register(aiRoutes);
  await fastify.register(accountRoutes);
  await fastify.register(feedbackRoutes);
  await fastify.register(adminFeedbackRoutes, { prefix: '/admin' });
  await fastify.register(analyticsRoutes);
  await fastify.register(adminAnalyticsRoutes, { prefix: '/admin' });

  // Global error handler
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    const statusCode = (error as any)?.statusCode ?? 500;

    // Validation errors (Zod)
    if (error instanceof ZodError) {
      return fail(reply, 400, 'Invalid request', 'ValidationError');
    }

    // Rate limit errors
    if (statusCode === 429) {
      return fail(reply, 429, 'Too many requests', 'RateLimit');
    }

    // Request body too large
    if ((error as any)?.code === 'FST_ERR_CTP_BODY_TOO_LARGE' || statusCode === 413) {
      return fail(reply, 413, 'Request too large', 'PayloadTooLarge');
    }

    // Prisma-ish errors
    if (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      error instanceof Prisma.PrismaClientValidationError ||
      error instanceof Prisma.PrismaClientRustPanicError ||
      error instanceof Prisma.PrismaClientInitializationError
    ) {
      return fail(
        reply,
        500,
        config.app.isDevelopment ? error.message : 'A database error occurred',
        'DatabaseError'
      );
    }

    const isError = error instanceof Error;
    const label = (isError && error.name) ? error.name : (statusCode >= 500 ? 'InternalServerError' : 'Error');
    const message =
      statusCode >= 500 && !config.app.isDevelopment
        ? 'An unexpected error occurred'
        : (isError ? error.message : 'An error occurred');

    return fail(reply, statusCode, message, label);
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    return fail(reply, 404, `Route ${request.method}:${request.url} not found`, 'NotFound');
  });

  return fastify;
}


