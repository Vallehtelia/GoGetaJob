import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { FastifyInstance } from 'fastify';
import path from 'path';

export default fp(async (fastify: FastifyInstance) => {
  // Register multipart plugin for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
      files: 1, // Max 1 file per request
    },
  });

  // Serve static files from uploads directory
  const uploadsPath = path.join(process.cwd(), 'uploads');
  await fastify.register(fastifyStatic, {
    root: uploadsPath,
    prefix: '/uploads/',
    decorateReply: false,
    // Allow cross-origin requests for images
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  });

  fastify.log.info('File upload plugin registered');
});
