import type { FastifyPluginAsync } from 'fastify';
import { noContent } from '../../utils/httpResponse.js';
import { safeDeleteUploadByUrl } from '../../utils/fileDeletion.js';
import { config } from '../../config/index.js';

const accountRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.delete('/account', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;

      // Grab picture url before deletion
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { profilePictureUrl: true },
      });

      if (!user) {
        // Token verified but user missing (stale token) - treat as already deleted
        return noContent(reply);
      }

      const profilePictureUrl = user.profilePictureUrl;

      await fastify.prisma.$transaction(async (tx) => {
        // Revoke refresh tokens (best-effort + explicit)
        await tx.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });

        // Delete user (cascades dependent data)
        await tx.user.delete({ where: { id: userId } });
      });

      // Best-effort file cleanup (never throw)
      try {
        await safeDeleteUploadByUrl(profilePictureUrl);
      } catch (err) {
        if (config.app.isDevelopment) {
          fastify.log.warn({ err, profilePictureUrl }, 'Failed to delete profile picture file during account deletion');
        }
      }

      return noContent(reply);
    },
  });
};

export default accountRoutes;

