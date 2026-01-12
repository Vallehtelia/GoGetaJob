import { FastifyPluginAsync } from 'fastify';
import { registerSchema, loginSchema, refreshTokenSchema } from './schemas.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { createTokens, verifyRefreshToken, revokeRefreshToken } from '../../utils/tokens.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register endpoint
  fastify.post('/auth/register', {
    config: {
      rateLimit: {
        max: 5,
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
          return reply.code(409).send({
            error: 'Conflict',
            message: 'User with this email already exists',
          });
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

        return reply.code(201).send({
          message: 'User registered successfully',
          user,
          accessToken,
          refreshToken,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
        }
        throw error;
      }
    },
  });

  // Login endpoint
  fastify.post('/auth/login', {
    config: {
      rateLimit: {
        max: 5,
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
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid email or password',
          });
        }

        // Verify password
        const isValidPassword = await verifyPassword(user.passwordHash, body.password);

        if (!isValidPassword) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid email or password',
          });
        }

        // Create tokens
        const { accessToken, refreshToken } = await createTokens(fastify, user.id);

        return reply.send({
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
          },
          accessToken,
          refreshToken,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
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
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid or expired refresh token',
          });
        }

        // Revoke old refresh token
        await revokeRefreshToken(fastify, body.refreshToken);

        // Create new tokens
        const { accessToken, refreshToken } = await createTokens(fastify, userId);

        return reply.send({
          message: 'Token refreshed successfully',
          accessToken,
          refreshToken,
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors,
          });
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

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return reply.send({ user });
    },
  });
};

export default authRoutes;


