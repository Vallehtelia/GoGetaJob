import { FastifyPluginAsync } from 'fastify';
import { setApiKeySchema } from './schemas.js';
import { encryptString, decryptString, getLastChars } from '../../utils/crypto.js';

const openaiRoutes: FastifyPluginAsync = async (fastify) => {
  // Get OpenAI API key status (never returns full key)
  fastify.get('/settings/openai', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;

        const openaiKey = await fastify.prisma.openAiKey.findUnique({
          where: { userId },
        });

        if (!openaiKey) {
          return reply.send({
            hasKey: false,
            last4: null,
            updatedAt: null,
          });
        }

        // Decrypt to get last 4 characters
        let last4: string | null = null;
        try {
          const decrypted = decryptString(
            openaiKey.keyCiphertext,
            openaiKey.keyIv,
            openaiKey.keyTag
          );
          last4 = getLastChars(decrypted, 4);
        } catch (decryptError: any) {
          fastify.log.error({ err: decryptError }, 'Failed to decrypt OpenAI key for last4');
          // Still return hasKey=true even if decryption fails
        }

        return reply.send({
          hasKey: true,
          last4,
          updatedAt: openaiKey.updatedAt.toISOString(),
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to retrieve API key status',
        });
      }
    },
  });

  // Set/Update OpenAI API key
  fastify.put('/settings/openai', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = setApiKeySchema.parse(request.body);

        // Encrypt the API key
        const encrypted = encryptString(body.apiKey);
        const last4 = getLastChars(body.apiKey, 4);

        // Upsert (create or update)
        await fastify.prisma.openAiKey.upsert({
          where: { userId },
          create: {
            userId,
            keyCiphertext: encrypted.ciphertext,
            keyIv: encrypted.iv,
            keyTag: encrypted.tag,
          },
          update: {
            keyCiphertext: encrypted.ciphertext,
            keyIv: encrypted.iv,
            keyTag: encrypted.tag,
          },
        });

        return reply.send({
          message: 'OpenAI API key saved successfully',
          hasKey: true,
          last4,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Validation Error',
            message: error.errors.map((e: any) => e.message).join(', '),
          });
        }

        if (error.message?.includes('Encryption failed')) {
          return reply.code(500).send({
            statusCode: 500,
            error: 'Encryption Error',
            message: 'Failed to encrypt API key. Check server configuration.',
          });
        }

        fastify.log.error(error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to save API key',
        });
      }
    },
  });

  // Delete OpenAI API key
  fastify.delete('/settings/openai', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;

        const deleted = await fastify.prisma.openAiKey.deleteMany({
          where: { userId },
        });

        if (deleted.count === 0) {
          return reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            message: 'No API key found to delete',
          });
        }

        return reply.send({
          message: 'OpenAI API key deleted successfully',
          hasKey: false,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to delete API key',
        });
      }
    },
  });
};

export default openaiRoutes;
