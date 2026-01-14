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
  const configuredOrigins = config.cors.origins;
  const localDevOriginRegex = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

  fastify.log.info(
    { env: config.app.env, configuredOrigins },
    'CORS configured origins loaded'
  );

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow missing Origin (same-origin / server-to-server)
      if (!origin) return cb(null, true);

      // Development-friendly: allow localhost/127.0.0.1 on any port,
      // plus any explicitly configured origins
      if (config.app.isDevelopment) {
        if (localDevOriginRegex.test(origin) || configuredOrigins.includes(origin)) {
          return cb(null, true);
        }
        fastify.log.warn({ origin, configuredOrigins }, 'CORS origin rejected (development)');
        return cb(null, false);
      }

      // Production: strict allowlist only (plus missing origin handled above)
      if (configuredOrigins.includes(origin)) return cb(null, true);

      // IMPORTANT: do not throw, just disallow cleanly
      return cb(null, false);
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


