import { FastifyPluginAsync } from 'fastify';
import { config } from '../../config/index.js';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            app: { type: 'string' },
            short: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      return reply.send({
        ok: true,
        app: config.app.name,
        short: config.app.short,
        timestamp: new Date().toISOString(),
      });
    },
  });
};

export default healthRoutes;


