import { FastifyPluginAsync } from 'fastify';
import { setApiKeySchema } from './schemas.js';
import { encryptString, decryptString, getLastChars } from '../../utils/crypto.js';
import { ok, noContent, fail } from '../../utils/httpResponse.js';

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
          return ok(reply, { hasKey: false, last4: null, updatedAt: null });
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

        return ok(reply, { hasKey: true, last4, updatedAt: openaiKey.updatedAt.toISOString() });
      } catch (error: any) {
        fastify.log.error(error);
        return fail(reply, 500, 'Failed to retrieve API key status', 'InternalServerError');
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

        return ok(reply, { hasKey: true, last4 }, 'OpenAI API key saved successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid request', 'ValidationError');
        }

        if (error.message?.includes('Encryption failed')) {
          return fail(
            reply,
            500,
            'Failed to encrypt API key. Check server configuration.',
            'EncryptionError'
          );
        }

        fastify.log.error(error);
        return fail(reply, 500, 'Failed to save API key', 'InternalServerError');
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
          return fail(reply, 404, 'No API key found to delete', 'NotFound');
        }

        return noContent(reply);
      } catch (error: any) {
        fastify.log.error(error);
        return fail(reply, 500, 'Failed to delete API key', 'InternalServerError');
      }
    },
  });
};

export default openaiRoutes;
