## Summary

Implemented Admin Phase 1 & 2:

1) **Server-enforced admin gating foundation**
2) **Admin Feedback Inbox** (API + UI)

Normal users cannot access admin endpoints (403) and do not see admin navigation. Admin users can view all feedback with basic filters and pagination.

## Schema change

Updated `backend/prisma/schema.prisma`:

- Added `User.isAdmin Boolean @default(false) @map("is_admin")`

Apply to DB using your dev flow (e.g. Prisma Studio / `prisma db push` / migration).

## Backend: Admin gating (Phase 1)

Updated `backend/src/plugins/auth.ts`:

- Added `fastify.requireAdmin` decorator.
- Guard behavior:
  - Ensures auth is present (calls `authenticate` if needed)
  - Loads `users.is_admin` from DB per request
  - If missing user → `401 Unauthorized`
  - If not admin → `403 Forbidden`
  - Uses standardized error envelope via `fail()`

Also updated `/me` to return `isAdmin` so the frontend can hide/show admin UI.

## Backend: Admin feedback inbox (Phase 2)

Added:

- `backend/src/modules/admin/feedback/schemas.ts`
  - Validates query params: `type`, `q`, `userId`, `page`, `pageSize`, `sort`
- `backend/src/modules/admin/feedback/routes.ts`
  - `GET /admin/feedback`
    - Guards: `onRequest: [fastify.authenticate, fastify.requireAdmin]`
    - Returns `{ data: { items, pagination } }`
    - Supports:
      - filter by type
      - substring search on message (`ILIKE`)
      - filter by userId
      - sort newest/oldest
      - pagination (page/pageSize)

Registered in `backend/src/app.ts` with `{ prefix: '/admin' }`.

## Frontend

### isAdmin gating

- `frontend/lib/types.ts`: `User.isAdmin?: boolean`
- `frontend/components/AppShell/AppShell.tsx`: fetches `/me` after mount to determine `isAdmin`
- `frontend/components/Sidebar/Sidebar.tsx`: shows Admin nav link only when `isAdmin === true`

### Admin feedback inbox page

- `frontend/app/(app)/admin/feedback/page.tsx`
  - Calls `api.adminListFeedback(...)`
  - Shows filters (type, search, sort) + pagination
  - Handles `403` with a friendly Forbidden state (link back to dashboard)

### API client additions

- `frontend/lib/api.ts`: `adminListFeedback(params)`
- `frontend/lib/types.ts`: `AdminFeedbackItem`, `AdminFeedbackListData`, `PaginationMeta`

## How to test

1. Mark a user as admin in DB:
   - set `users.is_admin = true` for that user (Prisma Studio or SQL)
2. Login as admin:
   - Admin link appears in sidebar
   - `/admin/feedback` loads and shows feedback items
3. Login as normal user:
   - Admin link is hidden
   - Visiting `/admin/feedback` shows Forbidden
4. Direct API test:
   - Call `GET /admin/feedback` as non-admin → expect `403` standardized error response

## Follow-ups

- Add admin stats endpoint (counts by type / recent volume).
- Add richer RBAC beyond a single boolean (out of scope here).
