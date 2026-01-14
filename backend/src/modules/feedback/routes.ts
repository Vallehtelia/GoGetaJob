import type { FastifyPluginAsync } from 'fastify';
import { created, fail, ok } from '../../utils/httpResponse.js';
import { submitFeedbackSchema } from './schemas.js';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

const FEEDBACK_BODY_LIMIT_BYTES = 64 * 1024; // 64kb
const feedbackRateLimitKey = (req: any) => req.user?.userId ?? req.ip;

type FeedbackTypeDb = 'BUG' | 'FEATURE' | 'OTHER';
const typeToDb: Record<'bug' | 'feature' | 'other', FeedbackTypeDb> = {
  bug: 'BUG',
  feature: 'FEATURE',
  other: 'OTHER',
};

const dbToType: Record<FeedbackTypeDb, 'bug' | 'feature' | 'other'> = {
  BUG: 'bug',
  FEATURE: 'feature',
  OTHER: 'other',
};

type FeedbackRow = {
  id: string;
  user_id: string;
  type: FeedbackTypeDb;
  message: string;
  page_path: string | null;
  user_agent: string | null;
  created_at: Date;
};

const feedbackRoutes: FastifyPluginAsync = async (fastify) => {
  // Submit feedback
  fastify.post('/feedback', {
    onRequest: [fastify.authenticate],
    bodyLimit: FEEDBACK_BODY_LIMIT_BYTES,
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 hour',
        hook: 'preHandler',
        keyGenerator: feedbackRateLimitKey,
      },
    },
    handler: async (request, reply) => {
      try {
        const userId = request.user.userId;
        const body = submitFeedbackSchema.parse(request.body);

        const id = randomUUID();
        const type = typeToDb[body.type];
        const pagePath = body.pagePath ?? null;
        const userAgent = body.userAgent ?? (request.headers['user-agent'] as string | undefined) ?? null;

        const rows = await fastify.prisma.$queryRaw<FeedbackRow[]>(Prisma.sql`
          INSERT INTO feedback (id, user_id, type, message, page_path, user_agent)
          VALUES (${id}, ${userId}, ${type}::"FeedbackType", ${body.message}, ${pagePath}, ${userAgent})
          RETURNING id, user_id, type, message, page_path, user_agent, created_at
        `);

        const createdRow = rows[0];

        return created(
          reply,
          {
            id: createdRow.id,
            userId: createdRow.user_id,
            type: dbToType[createdRow.type],
            message: createdRow.message,
            pagePath: createdRow.page_path,
            userAgent: createdRow.user_agent,
            createdAt: createdRow.created_at,
          },
          'Feedback submitted'
        );
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return fail(reply, 400, 'Invalid input data', 'ValidationError');
        }
        throw error;
      }
    },
  });

  // List recent feedback for the current user (optional, useful for debugging)
  fastify.get('/feedback', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.userId;

      const rows = await fastify.prisma.$queryRaw<FeedbackRow[]>(Prisma.sql`
        SELECT id, user_id, type, message, page_path, user_agent, created_at
        FROM feedback
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 50
      `);

      return ok(
        reply,
        rows.map((r: FeedbackRow) => ({
          id: r.id,
          userId: r.user_id,
          type: dbToType[r.type],
          message: r.message,
          pagePath: r.page_path,
          userAgent: r.user_agent,
          createdAt: r.created_at,
        }))
      );
    },
  });
};

export default feedbackRoutes;

