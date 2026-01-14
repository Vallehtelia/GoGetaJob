## Summary

Implemented Admin Phase 3 & 4:

- **Phase 3**: Activity tracking MVP (sessions + page views) with low write volume and minimal metadata.
- **Phase 4**: Admin analytics dashboard + admin-only analytics API.

All endpoints use the standardized API envelope (or `204 No Content` for ingestion).

## Privacy notes (scope constraints)

- No full IP storage.
- Activity events store only:
  - timestamps
  - path (page views)
  - optional userAgent (session)
- Heartbeat is capped to **1/min** on the client to keep write volume low.

## Schema changes (Prisma)

Updated `backend/prisma/schema.prisma`:

- Added `ActivitySession` (mapped to `activity_sessions`)
  - `startedAt`, `lastSeenAt`, optional `endedAt`, optional `userAgent`
  - indexes: `(userId, startedAt)`, `(lastSeenAt)`
- Added `ActivityPageView` (mapped to `activity_page_views`)
  - `path`, timestamps, FK to session, denormalized `userId`
  - indexes: `(userId, createdAt)`, `(path, createdAt)`, `(sessionId, createdAt)`
- Added `User.activitySessions` + `User.activityPageViews` relations

To persist in DB, apply with your dev flow (e.g. Prisma db push/migration).

## Backend: ingestion endpoints (Phase 3)

Module:
- `backend/src/modules/analytics/{schemas.ts,routes.ts}` (registered in `backend/src/app.ts`)

Endpoints (auth required):

- `POST /analytics/session/start`
  - Body: `{ sessionId?: string }`
  - Creates a new session or resumes an existing active session
  - Returns `{ data: { sessionId } }`

- `POST /analytics/session/heartbeat`
  - Body: `{ sessionId: string }`
  - Updates `lastSeenAt` for active sessions
  - Returns `204`

- `POST /analytics/session/end`
  - Body: `{ sessionId: string }`
  - Sets `endedAt` (idempotent)
  - Returns `204`

- `POST /analytics/pageview`
  - Body: `{ sessionId: string, path: string }` (path must start with `/`)
  - Inserts a page view and updates session `lastSeenAt`
  - Returns `204`

Rate limits and body limits:

- `bodyLimit`: 16kb for all ingestion routes
- per-user (fallback ip) rate limits:
  - `pageview`: 120/min
  - `heartbeat`: 30/min
  - `session/start`: 60 per 10 min
  - `session/end`: 30 per 10 min

## Backend: admin analytics endpoint (Phase 4)

Module:
- `backend/src/modules/admin/analytics/{schemas.ts,routes.ts}` registered under `/admin`

Endpoint:
- `GET /admin/analytics/overview?days=7`
  - Guard: `authenticate + requireAdmin`
  - Returns:
    - `today`: DAU, sessions, pageViews, avgSessionSeconds
    - `series`: per-day DAU, sessions, pageViews for last N days

Definitions:
- DAU(date D): distinct `userId` with a session whose `lastSeenAt` is within that day.
- Sessions(date D): sessions with `startedAt` within that day.
- PageViews(date D): page views with `createdAt` within that day.
- Avg session seconds today:
  - average of `min(12h, COALESCE(endedAt,lastSeenAt)-startedAt)` over sessions started today.

## Frontend: tracking client (Phase 3)

Added `frontend/lib/analytics.ts` and integrated into authenticated layout `frontend/app/(app)/layout.tsx`:

- On first load after login:
  - `POST /analytics/session/start` (reuses localStorage session id if present)
- On route change:
  - debounced (250ms) `POST /analytics/pageview`
- Heartbeat:
  - `POST /analytics/session/heartbeat` every 60s
- Best-effort end:
  - `POST /analytics/session/end` on unmount (not guaranteed)

Errors are ignored to never block UI.

## Frontend: admin dashboard UI (Phase 4)

- Added `frontend/app/(app)/admin/page.tsx`
  - Fetches `api.adminGetAnalyticsOverview(7)`
  - Renders “today” metric cards and a simple 7-day table
- Updated admin navigation to include:
  - `/admin` (Admin Dashboard)
  - `/admin/feedback` (Feedback Inbox)

## Files changed / added (high level)

Backend:
- `backend/prisma/schema.prisma`
- `backend/src/modules/analytics/*`
- `backend/src/modules/admin/analytics/*`
- `backend/src/app.ts`

Frontend:
- `frontend/lib/analytics.ts`
- `frontend/app/(app)/layout.tsx`
- `frontend/app/(app)/admin/page.tsx`
- `frontend/lib/api.ts`
- `frontend/lib/types.ts`
- `frontend/components/Sidebar/Sidebar.tsx`

## How to test (manual)

1. Login as a normal user; navigate across 3–5 routes.
2. Confirm DB has:
   - `activity_sessions` row for the user
   - `activity_page_views` rows for those routes
3. Leave app open 2–3 minutes; confirm `last_seen_at` updates.
4. Login as admin; open `/admin` and confirm metrics load.
5. Confirm non-admin users:
   - do not see admin links
   - get 403 on `/admin/analytics/overview`

## Follow-ups

- Add “end session” reliability via server-side TTL or a background cleanup job (not required yet).
- Add charts (recharts) if desired; current UI uses a simple table for low dependency footprint.
