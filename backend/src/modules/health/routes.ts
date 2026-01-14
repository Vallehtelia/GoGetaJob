import { FastifyPluginAsync } from 'fastify';
import { config } from '../../config/index.js';
import { ok } from '../../utils/httpResponse.js';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                ok: { type: 'boolean' },
                app: { type: 'string' },
                short: { type: 'string' },
                timestamp: { type: 'string' },
              },
              required: ['ok', 'app', 'short', 'timestamp'],
            },
          },
          required: ['data'],
        },
      },
    },
    handler: async (_request, reply) => {
      return ok(reply, {
        ok: true,
        app: config.app.name,
        short: config.app.short,
        timestamp: new Date().toISOString(),
      });
    },
  });
};

export default healthRoutes;


