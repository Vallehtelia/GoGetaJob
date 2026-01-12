import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log: fastify.log.level === 'debug' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  });

  // Test database connection
  await prisma.$connect();
  fastify.log.info('✅ Database connected');

  // Add prisma to fastify instance
  fastify.decorate('prisma', prisma);

  // Graceful shutdown
  fastify.addHook('onClose', async (instance) => {
    instance.log.info('Disconnecting from database...');
    await instance.prisma.$disconnect();
  });
};

export default fp(prismaPlugin);


