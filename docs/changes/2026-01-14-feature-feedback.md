## Summary

Added a lightweight, authenticated feedback feature so logged-in users can submit bug reports/feature requests directly from anywhere in the app (authenticated area only).

Feedback is stored in Postgres (via Prisma schema) and submitted through a new API endpoint with rate limiting.

## Schema changes (Prisma)

Updated `backend/prisma/schema.prisma`:

- Added `enum FeedbackType { BUG FEATURE OTHER }`
- Added `model Feedback`:
  - `id` (uuid)
  - `userId` (FK → User, cascade on delete)
  - `type` (enum)
  - `message` (Text)
  - optional `pagePath` and `userAgent`
  - `createdAt`
  - index on `(userId, createdAt)`
- Added `feedbacks Feedback[]` relation on `User`

Note: to persist to a real database, apply the schema change via your normal Prisma flow (e.g. `prisma db push` or a migration).

## Backend endpoints

Module: `backend/src/modules/feedback/*` (registered in `backend/src/app.ts`)

- `POST /feedback`
  - Auth required
  - Body:
    - `type`: `bug | feature | other`
    - `message`: 10–5000 chars
    - optional `pagePath` (max 500)
    - optional `userAgent` (max 500)
  - Response: `201` with `{ data: Feedback, message: "Feedback submitted" }`
  - Rate limited: `max 10 per hour` (keyed per user, fallback to IP)

- `GET /feedback` (optional but included)
  - Auth required
  - Returns last 50 feedback entries for the current user ordered by newest first

## Frontend UI

- Global entry point added to the authenticated top bar (`frontend/components/AppShell/AppShell.tsx`)
  - “Feedback” button opens a modal
  - Not shown on login/register because those routes do not render `AppShell` (and print routes also skip it)

- Modal fields:
  - Type selector (Bug/Feature/Other)
  - Message textarea
  - Automatically includes `pagePath` and `userAgent` metadata

- On submit:
  - calls `api.submitFeedback(...)`
  - shows toast “Thanks for the feedback!”
  - closes and resets the modal
  - shows a friendly message on `429` (rate limit)

## Files changed

- Backend:
  - `backend/prisma/schema.prisma`
  - `backend/src/modules/feedback/schemas.ts` (new)
  - `backend/src/modules/feedback/routes.ts` (new)
  - `backend/src/app.ts`
- Frontend:
  - `frontend/lib/types.ts`
  - `frontend/lib/api.ts`
  - `frontend/components/AppShell/AppShell.tsx`

## How to test (manual)

1. Login, open dashboard.
2. Click **Feedback** in the top bar.
3. Submit a “Bug” report with a message ≥ 10 chars.
4. Confirm success toast and modal resets.
5. Verify in DB (Prisma Studio/SQL) that a feedback row exists for the user.
6. Optional: `GET /feedback` returns recent entries.
7. Submit repeatedly until rate-limited → confirm `429` and friendly UI message.

## Follow-ups

- Add an admin view to browse feedback across users (out of scope here).
- Consider adding attachments/screenshots later (would require storage decisions).
