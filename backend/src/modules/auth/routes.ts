import { FastifyPluginAsync } from 'fastify';
import { registerSchema, loginSchema, refreshTokenSchema, logoutSchema, changePasswordSchema } from './schemas.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { createTokens, verifyRefreshToken, revokeRefreshToken, revokeAllUserTokens, hashToken } from '../../utils/tokens.js';
import { ok, created, fail, noContent } from '../../utils/httpResponse.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register endpoint
  fastify.post('/auth/register', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '15 minutes',
      },
    },
    handler: async (request, reply) => {
      try {
        // Validate input
        const body = registerSchema.parse(request.body);

        // Check if user already exists
        const existingUser = await fastify.prisma.user.findUnique({
          where: { email: body.email },
        });

        if (existingUser) {
          return fail(reply, 409, 'User with this email already exists', 'Conflict');
        }

        // Hash password
        const passwordHash = await hashPassword(body.password);

        // Create user
        const user = await fastify.prisma.user.create({
          data: {
            email: body.email,
            passwordHash,
          },
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        });

        // Create tokens
        const { accessToken, refreshToken } = await createTokens(fastify, user.id);

        return created(
          reply,
          { user, accessToken, refreshToken },
          'User registered successfully'
        );
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Login endpoint
  fastify.post('/auth/login', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '15 minutes',
      },
    },
    handler: async (request, reply) => {
      try {
        // Validate input
        const body = loginSchema.parse(request.body);

        // Find user
        const user = await fastify.prisma.user.findUnique({
          where: { email: body.email },
        });

        if (!user) {
          return fail(reply, 401, 'Invalid email or password', 'Unauthorized');
        }

        // Verify password
        const isValidPassword = await verifyPassword(user.passwordHash, body.password);

        if (!isValidPassword) {
          return fail(reply, 401, 'Invalid email or password', 'Unauthorized');
        }

        // Create tokens
        const { accessToken, refreshToken } = await createTokens(fastify, user.id);

        const adminRows = await fastify.prisma.$queryRaw<{ is_admin: boolean }[]>`
          SELECT is_admin
          FROM users
          WHERE id = ${user.id}
          LIMIT 1
        `;
        const isAdmin = adminRows[0]?.is_admin ?? false;

        return ok(
          reply,
          {
            user: {
              id: user.id,
              email: user.email,
              createdAt: user.createdAt,
              isAdmin,
            },
            accessToken,
            refreshToken,
          },
          'Login successful'
        );
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Refresh token endpoint
  fastify.post('/auth/refresh', {
    handler: async (request, reply) => {
      try {
        // Validate input
        const body = refreshTokenSchema.parse(request.body);

        // Verify refresh token
        const userId = await verifyRefreshToken(fastify, body.refreshToken);

        if (!userId) {
          return fail(reply, 401, 'Invalid or expired refresh token', 'Unauthorized');
        }

        // Revoke old refresh token
        await revokeRefreshToken(fastify, body.refreshToken);

        // Create new tokens
        const { accessToken, refreshToken } = await createTokens(fastify, userId);

        return ok(reply, { accessToken, refreshToken }, 'Token refreshed successfully');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Logout endpoint (revoke a specific refresh token) - idempotent
  fastify.post('/auth/logout', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = logoutSchema.parse(request.body);

        const tokenHash = hashToken(body.refreshToken);
        await fastify.prisma.refreshToken.updateMany({
          where: {
            tokenHash,
            userId,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });

        return noContent(reply);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Logout all endpoint (revoke all refresh tokens for user) - idempotent
  fastify.post('/auth/logout-all', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;
      await revokeAllUserTokens(fastify, userId);
      return noContent(reply);
    },
  });

  // Change password endpoint
  fastify.post('/auth/change-password', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = changePasswordSchema.parse(request.body);

        if (body.currentPassword === body.newPassword) {
          return fail(reply, 400, 'New password must be different from current password', 'BadRequest');
        }

        const user = await fastify.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, passwordHash: true },
        });

        if (!user) {
          return fail(reply, 404, 'User not found', 'NotFound');
        }

        const isValid = await verifyPassword(user.passwordHash, body.currentPassword);
        if (!isValid) {
          return fail(reply, 401, 'Invalid current password', 'Unauthorized');
        }

        const nextHash = await hashPassword(body.newPassword);
        await fastify.prisma.user.update({
          where: { id: userId },
          data: { passwordHash: nextHash },
        });

        await revokeAllUserTokens(fastify, userId);

        return noContent(reply);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Get current user (protected)
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;

      const rows = await fastify.prisma.$queryRaw<
        { id: string; email: string; created_at: Date; updated_at: Date; is_admin: boolean }[]
      >`
        SELECT id, email, created_at, updated_at, is_admin
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `;
      const row = rows[0];

      if (!row) {
        return fail(reply, 404, 'User not found', 'NotFound');
      }

      return ok(reply, {
        id: row.id,
        email: row.email,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isAdmin: row.is_admin,
      });
    },
  });
};

export default authRoutes;


