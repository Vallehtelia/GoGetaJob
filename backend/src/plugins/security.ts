import { FastifyPluginAsync } from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import fp from 'fastify-plugin';
import { config } from '../config/index.js';

const securityPlugin: FastifyPluginAsync = async (fastify) => {
  // Helmet - secure headers
  await fastify.register(helmet, {
    contentSecurityPolicy: config.app.isProduction ? undefined : false,
  });

  // CORS
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests from configured origins or no origin (same-origin)
      if (!origin || config.cors.origins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    global: false, // We'll apply it per-route
    max: config.security.rateLimit.max,
    timeWindow: config.security.rateLimit.timeWindow,
  });

  fastify.log.info('✅ Security plugins loaded');
};

export default fp(securityPlugin);


