import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { ok } from '../../../utils/httpResponse.js';
import { adminAnalyticsOverviewQuerySchema } from './schemas.js';

type SeriesRow = {
  date: string; // YYYY-MM-DD
  dau: number;
  page_views: number;
  sessions: number;
};

type TodayRow = {
  dau: number;
  sessions: number;
  page_views: number;
  avg_session_seconds: number | null;
};

const adminAnalyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/analytics/overview', {
    onRequest: [fastify.authenticate, fastify.requireAdmin],
    handler: async (request, reply) => {
      const { days } = adminAnalyticsOverviewQuerySchema.parse(request.query);

      // Today metrics
      const todayRows = await fastify.prisma.$queryRaw<TodayRow[]>(Prisma.sql`
        WITH bounds AS (
          SELECT date_trunc('day', now()) AS start_ts,
                 date_trunc('day', now()) + interval '1 day' AS end_ts
        )
        SELECT
          (SELECT COUNT(DISTINCT s.user_id)
           FROM activity_sessions s, bounds b
           WHERE s.last_seen_at >= b.start_ts AND s.last_seen_at < b.end_ts
          )::int AS dau,
          (SELECT COUNT(*)
           FROM activity_sessions s, bounds b
           WHERE s.started_at >= b.start_ts AND s.started_at < b.end_ts
          )::int AS sessions,
          (SELECT COUNT(*)
           FROM activity_page_views pv, bounds b
           WHERE pv.created_at >= b.start_ts AND pv.created_at < b.end_ts
          )::int AS page_views,
          (SELECT COALESCE(
              AVG(LEAST(EXTRACT(EPOCH FROM (COALESCE(s.ended_at, s.last_seen_at) - s.started_at)), 43200)),
              0
            )
           FROM activity_sessions s, bounds b
           WHERE s.started_at >= b.start_ts AND s.started_at < b.end_ts
          )::float AS avg_session_seconds
      `);

      const today = todayRows[0] ?? {
        dau: 0,
        sessions: 0,
        page_views: 0,
        avg_session_seconds: 0,
      };

      // Series for last N days including today (oldest -> newest)
      const seriesRows = await fastify.prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
        WITH days AS (
          SELECT generate_series(
            date_trunc('day', now()) - (${days - 1}::int) * interval '1 day',
            date_trunc('day', now()),
            interval '1 day'
          ) AS day_start
        )
        SELECT
          to_char(d.day_start, 'YYYY-MM-DD') AS date,
          (
            SELECT COUNT(DISTINCT s.user_id)
            FROM activity_sessions s
            WHERE s.last_seen_at >= d.day_start AND s.last_seen_at < d.day_start + interval '1 day'
          )::int AS dau,
          (
            SELECT COUNT(*)
            FROM activity_page_views pv
            WHERE pv.created_at >= d.day_start AND pv.created_at < d.day_start + interval '1 day'
          )::int AS page_views,
          (
            SELECT COUNT(*)
            FROM activity_sessions s
            WHERE s.started_at >= d.day_start AND s.started_at < d.day_start + interval '1 day'
          )::int AS sessions
        FROM days d
        ORDER BY d.day_start ASC
      `);

      return ok(reply, {
        today: {
          dau: today.dau,
          sessions: today.sessions,
          pageViews: today.page_views,
          avgSessionSeconds: Math.round((today.avg_session_seconds ?? 0) as number),
        },
        series: seriesRows.map((r) => ({
          date: r.date,
          dau: r.dau,
          pageViews: r.page_views,
          sessions: r.sessions,
        })),
      });
    },
  });
};

export default adminAnalyticsRoutes;

