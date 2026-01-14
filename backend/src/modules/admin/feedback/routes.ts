import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { ok } from '../../../utils/httpResponse.js';
import { adminFeedbackQuerySchema } from './schemas.js';

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

type AdminFeedbackRow = {
  id: string;
  user_id: string;
  email: string;
  type: FeedbackTypeDb;
  message: string;
  page_path: string | null;
  user_agent: string | null;
  created_at: Date;
};

type CountRow = { count: number };

const adminFeedbackRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/feedback', {
    onRequest: [fastify.authenticate, fastify.requireAdmin],
    handler: async (request, reply) => {
      const query = adminFeedbackQuerySchema.parse(request.query);

      const whereParts: Prisma.Sql[] = [];
      if (query.type) {
        whereParts.push(Prisma.sql`f.type = ${typeToDb[query.type]}::"FeedbackType"`);
      }
      if (query.userId) {
        whereParts.push(Prisma.sql`f.user_id = ${query.userId}`);
      }
      if (query.q) {
        const like = `%${query.q}%`;
        whereParts.push(Prisma.sql`f.message ILIKE ${like}`);
      }

      const whereSql =
        whereParts.length > 0 ? Prisma.sql`WHERE ${Prisma.join(whereParts, ' AND ')}` : Prisma.empty;

      const orderBy = query.sort === 'oldest'
        ? Prisma.raw('f.created_at ASC')
        : Prisma.raw('f.created_at DESC');

      const offset = (query.page - 1) * query.pageSize;

      const countRows = await fastify.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::int as count
        FROM feedback f
        ${whereSql}
      `);
      const totalItems = countRows[0]?.count ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));

      const rows = await fastify.prisma.$queryRaw<AdminFeedbackRow[]>(Prisma.sql`
        SELECT
          f.id,
          f.user_id,
          u.email,
          f.type,
          f.message,
          f.page_path,
          f.user_agent,
          f.created_at
        FROM feedback f
        JOIN users u ON u.id = f.user_id
        ${whereSql}
        ORDER BY ${orderBy}
        LIMIT ${query.pageSize}
        OFFSET ${offset}
      `);

      const items = rows.map((r) => ({
        id: r.id,
        type: dbToType[r.type],
        message: r.message,
        pagePath: r.page_path,
        userAgent: r.user_agent,
        createdAt: r.created_at,
        user: { id: r.user_id, email: r.email },
      }));

      return ok(reply, {
        items,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages,
        },
      });
    },
  });
};

export default adminFeedbackRoutes;

