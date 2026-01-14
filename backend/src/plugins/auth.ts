import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import { config } from '../config/index.js';
import { fail } from '../utils/httpResponse.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string };
    user: { userId: string };
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Register JWT plugin
  fastify.register(fastifyJwt, {
    secret: config.jwt.accessSecret,
    sign: {
      expiresIn: config.jwt.accessExpiresIn,
    },
  });

  // Authentication decorator
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return fail(reply, 401, 'Invalid or expired token', 'Unauthorized');
    }
  });

  // Admin guard (DB-checked per request)
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    // Ensure user is authenticated (allow calling standalone or in onRequest chain)
    if (!request.user?.userId) {
      const res = await fastify.authenticate(request, reply);
      if (reply.sent) return res;
    }

    const userId = request.user.userId;
    const rows = await fastify.prisma.$queryRaw<{ is_admin: boolean }[]>`
      SELECT is_admin
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    const row = rows[0];

    if (!row) {
      return fail(reply, 401, 'Unauthorized', 'Unauthorized');
    }
    if (!row.is_admin) {
      return fail(reply, 403, 'Forbidden', 'Forbidden');
    }
  });
};

export default fp(authPlugin);

