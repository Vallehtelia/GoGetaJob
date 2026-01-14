import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ok, noContent, fail } from '../../utils/httpResponse.js';
import { pageviewSchema, sessionIdSchema, sessionStartSchema } from './schemas.js';

const BODY_LIMIT_BYTES = 16 * 1024; // 16kb
const keyByUser = (req: any) => req.user?.userId ?? req.ip;

type SessionRow = {
  id: string;
  user_id: string;
  started_at: Date;
  last_seen_at: Date;
  ended_at: Date | null;
};

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // Start or resume a session
  fastify.post('/analytics/session/start', {
    onRequest: [fastify.authenticate],
    bodyLimit: BODY_LIMIT_BYTES,
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '10 minutes',
        hook: 'preHandler',
        keyGenerator: keyByUser,
      },
    },
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = sessionStartSchema.parse(request.body);
        const now = new Date();

        if (body.sessionId) {
          const rows = await fastify.prisma.$queryRaw<SessionRow[]>(Prisma.sql`
            UPDATE activity_sessions
            SET last_seen_at = ${now}
            WHERE id = ${body.sessionId}
              AND user_id = ${userId}
              AND ended_at IS NULL
            RETURNING id, user_id, started_at, last_seen_at, ended_at
          `);

          if (rows.length > 0) {
            return ok(reply, { sessionId: rows[0].id });
          }
        }

        const sessionId = randomUUID();
        await fastify.prisma.$executeRaw(Prisma.sql`
          INSERT INTO activity_sessions (id, user_id, started_at, last_seen_at, ended_at, user_agent, created_at)
          VALUES (${sessionId}, ${userId}, ${now}, ${now}, NULL, ${String(request.headers['user-agent'] ?? '') || null}, ${now})
        `);

        return ok(reply, { sessionId });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Heartbeat (update lastSeenAt)
  fastify.post('/analytics/session/heartbeat', {
    onRequest: [fastify.authenticate],
    bodyLimit: BODY_LIMIT_BYTES,
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
        hook: 'preHandler',
        keyGenerator: keyByUser,
      },
    },
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = sessionIdSchema.parse(request.body);
        const now = new Date();

        const res = await fastify.prisma.$executeRaw(Prisma.sql`
          UPDATE activity_sessions
          SET last_seen_at = ${now}
          WHERE id = ${body.sessionId}
            AND user_id = ${userId}
            AND ended_at IS NULL
        `);

        if (typeof res === 'number' && res === 0) {
          return fail(reply, 404, 'Session not found', 'NotFound');
        }

        return noContent(reply);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // End session (idempotent)
  fastify.post('/analytics/session/end', {
    onRequest: [fastify.authenticate],
    bodyLimit: BODY_LIMIT_BYTES,
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '10 minutes',
        hook: 'preHandler',
        keyGenerator: keyByUser,
      },
    },
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = sessionIdSchema.parse(request.body);
        const now = new Date();

        // First try ending an active session
        const res = await fastify.prisma.$executeRaw(Prisma.sql`
          UPDATE activity_sessions
          SET ended_at = ${now}, last_seen_at = ${now}
          WHERE id = ${body.sessionId}
            AND user_id = ${userId}
            AND ended_at IS NULL
        `);

        if (typeof res === 'number' && res > 0) {
          return noContent(reply);
        }

        // If already ended, treat as idempotent success if it exists for this user
        const exists = await fastify.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT id
          FROM activity_sessions
          WHERE id = ${body.sessionId} AND user_id = ${userId}
          LIMIT 1
        `);
        if (exists.length > 0) {
          return noContent(reply);
        }

        return fail(reply, 404, 'Session not found', 'NotFound');
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // Page view
  fastify.post('/analytics/pageview', {
    onRequest: [fastify.authenticate],
    bodyLimit: BODY_LIMIT_BYTES,
    config: {
      rateLimit: {
        max: 120,
        timeWindow: '1 minute',
        hook: 'preHandler',
        keyGenerator: keyByUser,
      },
    },
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = pageviewSchema.parse(request.body);
        const now = new Date();

        const session = await fastify.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT id
          FROM activity_sessions
          WHERE id = ${body.sessionId}
            AND user_id = ${userId}
            AND ended_at IS NULL
          LIMIT 1
        `);
        if (session.length === 0) {
          return fail(reply, 404, 'Session not found', 'NotFound');
        }

        const pageViewId = randomUUID();
        await fastify.prisma.$executeRaw(Prisma.sql`
          INSERT INTO activity_page_views (id, session_id, user_id, path, created_at)
          VALUES (${pageViewId}, ${body.sessionId}, ${userId}, ${body.path}, ${now})
        `);

        await fastify.prisma.$executeRaw(Prisma.sql`
          UPDATE activity_sessions SET last_seen_at = ${now}
          WHERE id = ${body.sessionId} AND user_id = ${userId}
        `);

        return noContent(reply);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });
};

export default analyticsRoutes;

