import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import { config } from '../config/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
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
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  });
};

export default fp(authPlugin);

