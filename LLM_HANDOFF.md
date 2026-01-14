# GoGetaJob (GGJ) — LLM Handoff (Architecture, Features, and Pre-Tester TODOs)

This document is written **for another coding LLM** so it can quickly understand the entire GoGetaJob application, how features are implemented, where to modify code, and what’s still missing before opening the app to external testers.

---

## Product overview (what the app is)

**GoGetaJob (GGJ)** is a job-search tool that combines:

- **Job application tracking** (CRUD + filters/search/pagination)
- **A “master experience library”** (work/education/skills/projects entered once)
- **CV documents** that *select* items from the library (many-to-many via inclusion tables)
- **Immutable CV snapshots** attached to applications (freeze “what CV did I send?”)
- **AI features** (server-side OpenAI calls using a user-provided API key stored encrypted)
- **A freeform CV “canvas layout editor”** stored as JSON (`canvasState`) and printable as A4

The repo is split into:

- `backend/`: Fastify API + Prisma + PostgreSQL
- `frontend/`: Next.js App Router UI + typed API client

---

## Tech stack

- **Backend**: Node.js + TypeScript, **Fastify**, **Prisma**, PostgreSQL, Zod validation
- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind
- **Auth**: JWT access tokens + random refresh tokens stored hashed in DB (single-use rotation)
- **AI**: OpenAI SDK (server-side), Structured Outputs (JSON schema) for some endpoints
- **Files**: Profile picture upload via `@fastify/multipart`, served from `/uploads/*`

---

## How to run locally (high level)

- Start DB: `docker compose up -d`
- Backend: `cd backend && npm i && npx prisma generate && npx prisma db push && npm run dev`
- Frontend: `cd frontend && npm i && npm run dev` (runs on `:3001`)

Key environment requirements:

- Backend reads env via `backend/src/config/index.ts` (all vars must have **`GGJ_` prefix**).
- Prisma uses `GGJ_DATABASE_URL`.
- **OpenAI key encryption requires `GGJ_ENCRYPTION_KEY`** (base64-encoded 32-byte key).

---

## Repository structure (where things live)

### Backend

- Entry:
  - `backend/src/server.ts`: listens and prints banner
  - `backend/src/app.ts`: registers plugins/routes and global error/404 handlers
- Plugins:
  - `backend/src/plugins/security.ts`: helmet + CORS + rate-limit (per-route)
  - `backend/src/plugins/auth.ts`: JWT + `fastify.authenticate` decorator
  - `backend/src/plugins/prisma.ts`: Prisma client attached to `fastify.prisma`
  - `backend/src/plugins/fileUpload.ts`: multipart + static serving for `/uploads/`
- Modules (routes + schemas per feature):
  - `backend/src/modules/auth/*`
  - `backend/src/modules/profile/*`
  - `backend/src/modules/applications/*`
  - `backend/src/modules/library/*`
  - `backend/src/modules/cv/*`
  - `backend/src/modules/snapshots/*`
  - `backend/src/modules/openai/*` (OpenAI key management)
  - `backend/src/modules/ai/*` (AI endpoints)
- AI prompts/schemas:
  - `backend/src/ai/prompts/*`
  - `backend/src/ai/schemas/*`

### Frontend

- App Router:
  - `frontend/app/(auth)/*`: login/register (public)
  - `frontend/app/(app)/*`: authenticated app pages
  - `frontend/app/(app)/layout.tsx`: route protection + AppShell + Chatbot (except print routes)
- API client:
  - `frontend/lib/api.ts`: token-aware fetch wrapper + typed endpoints
  - `frontend/lib/auth.ts`: localStorage token utilities
  - `frontend/lib/types.ts`: frontend DTOs matching backend responses
- UI:
  - `frontend/components/*`: AppShell, Sidebar, Toast, ConfirmDialog, Chatbot, UI primitives
- CV Canvas:
  - `frontend/components/cv/*`: canvas editor + syncing helpers

---

## Database model (Prisma)

See: `backend/prisma/schema.prisma`.

Core entities:

- **User**
  - auth: `email`, `passwordHash`
  - profile: `firstName`, `lastName`, `phone`, `location`, `headline`, `summary`, `profilePictureUrl`, social links
- **RefreshToken**: hashed refresh tokens, revocation, expiry
- **JobApplication**: company/position/link/status/dates/notes, belongs to user
- **Master Library (user-level)**
  - `UserWorkExperience`, `UserEducation`, `UserSkill`, `UserProject`
- **CV Document**
  - `CvDocument`: `title`, `template`, `isDefault`
  - AI: `overrideSummary` (string override)
  - Canvas: `canvasState` (JSON layout)
- **CV Inclusions (junction tables)**
  - `CvWorkInclusion`, `CvEducationInclusion`, `CvSkillInclusion`, `CvProjectInclusion`
  - Each has `order` + unique constraint per (cvId, itemId)
- **CV Snapshot (immutable copy)**
  - `CvSnapshot` + `CvSnapshotHeader` + per-section snapshot tables
  - One snapshot per application via unique `applicationId`
- **OpenAiKey**
  - encrypted at rest (ciphertext + iv + tag) using `GGJ_ENCRYPTION_KEY`

Deletion behavior:

- Most relations use `onDelete: Cascade`, so deleting a user removes most dependent records.

---

## Authentication & session model (backend + frontend)

### Backend

- `backend/src/plugins/auth.ts` registers JWT and adds `fastify.authenticate`.
- Access token is a JWT signed by `GGJ_JWT_ACCESS_SECRET` with expiry `GGJ_JWT_ACCESS_EXPIRES_IN`.
- Refresh token is a random string (not JWT) generated in `backend/src/utils/tokens.ts`, stored as **SHA-256 hash** in `RefreshToken`.
- `/auth/refresh`:
  - verifies the refresh token by hashing and finding DB row
  - checks `revokedAt` and `expiresAt`
  - **revokes old refresh token** and issues a new access+refresh pair (single-use rotation)

### Frontend

- Tokens are stored in localStorage (`frontend/lib/auth.ts`).
- `frontend/lib/api.ts` automatically retries once on `401` by calling `/auth/refresh`.
  - refresh requests are deduplicated (concurrent 401s share one refresh promise).
- Protected routing:
  - `frontend/app/(app)/layout.tsx` redirects to `/login` if not authenticated.
  - Print routes (path contains `/print`) bypass AppShell and Chatbot.

Security note:

- For production, consider moving refresh tokens to **httpOnly cookies** and adding CSRF protection (see TODOs).

---

## Feature map (what exists today)

### 0) Landing / marketing page

- Frontend: `frontend/app/page.tsx`
  - If logged in, CTA routes to `/dashboard`, otherwise `/register`.
  - Contains a screenshot carousel (static images under `frontend/public/screenshots/`).

### 0B) Dashboard (stats + “profile completeness”)

- Frontend: `frontend/app/(app)/dashboard/page.tsx`
  - Loads profile + applications.
  - Computes simple stats (total/interviews/offers/response rate) and a profile completeness %.
  - Shows recent applications list linking to `/applications/[id]`.

### 1) Health

- Backend: `GET /health`

### 2) Auth

- Backend:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `GET /me`
- Frontend:
  - `frontend/app/(auth)/login/page.tsx`
  - `frontend/app/(auth)/register/page.tsx`

### 3) Profile (user info + picture)

- Backend:
  - `GET /profile`, `PATCH /profile`
  - `POST /profile/picture` (multipart upload)
  - `DELETE /profile/picture`
- Frontend:
  - Settings → Profile tab: `frontend/app/(app)/settings/page.tsx`
  - Upload uses `api.uploadProfilePicture(file)` which posts multipart directly.
- File serving:
  - Backend serves `/uploads/*` via `backend/src/plugins/fileUpload.ts`

### 4) Job applications

- Backend:
  - `POST /applications`
  - `GET /applications` with filters
    - supports both `q` and `search`, and both `sort` and `sortBy` (see `backend/src/modules/applications/schemas.ts`)
  - `GET /applications/:id`, `PATCH /applications/:id`, `DELETE /applications/:id`
- Frontend:
  - List: `frontend/app/(app)/applications/page.tsx`
  - Create: `frontend/app/(app)/applications/new/page.tsx`
  - Edit: `frontend/app/(app)/applications/[id]/page.tsx`

### 5) Experience Library (master data)

User-level CRUD for re-usable CV items:

- Backend (`backend/src/modules/library/routes.ts`):
  - Work: `/profile/library/work`
  - Education: `/profile/library/education`
  - Skills: `/profile/library/skills`
  - Projects: `/profile/library/projects`
- Frontend:
  - Settings → Experience Library tab: `frontend/app/(app)/settings/page.tsx`

### 6) CV documents (select from library)

- Backend (`backend/src/modules/cv/routes.ts`):
  - `GET /cv`, `POST /cv`, `GET /cv/:id`, `PATCH /cv/:id`, `DELETE /cv/:id`
  - inclusion endpoints:
    - Work: `POST/DELETE/PATCH /cv/:id/work/:itemId?`
    - Education: `POST/DELETE/PATCH /cv/:id/education/:itemId?`
    - Skills: `POST/DELETE/PATCH /cv/:id/skills/:itemId?`
    - Projects: `POST/DELETE/PATCH /cv/:id/projects/:itemId?`
  - `GET /cv/:id` “flattens” inclusions into `workExperiences/educations/skills/projects` arrays and includes `order` + `inclusionId`.
- Frontend:
  - CV list: `frontend/app/(app)/cv/page.tsx`
  - CV editor: `frontend/app/(app)/cv/[id]/page.tsx`
    - left side: checkbox selection of library items
    - right side: live preview via canvas layout editor
  - Print: `frontend/app/(app)/cv/[id]/print/page.tsx`

### 7) CV Snapshots (immutable CV copy linked to an application)

- Backend:
  - `POST /applications/:id/snapshot` (create/replace)
  - `GET /applications/:id/snapshot`
  - `DELETE /applications/:id/snapshot`
  - `GET /snapshots/:id`
- Snapshot creation logic:
  - `backend/src/modules/snapshots/service.ts` copies profile + CV inclusions into snapshot tables in a DB transaction.
- Frontend:
  - Snapshot controls in application edit page: `frontend/app/(app)/applications/[id]/page.tsx`
  - Snapshot view: `frontend/app/(app)/applications/[id]/snapshot/page.tsx`

### 8) CV “canvasState” layout editor (freeform layout, printable)

Purpose:

- The classic “template v1” preview is now complemented by a **freeform A4 canvas editor** stored in `CvDocument.canvasState`.
- Users can drag, resize, and edit block text, then print as A4.

Frontend implementation:

- `frontend/components/cv/buildDefaultCanvasState.ts`
  - builds a default A4 layout with blocks for HEADER/SUMMARY/WORK/PROJECTS/SKILLS/EDUCATION
- `frontend/components/cv/CvCanvasEditor.tsx`
  - uses `react-rnd` for drag/resize
  - stores `dirty` state, “Save layout”, “Reset to template”
  - allows text editing per block while in edit mode
- `frontend/components/cv/syncCanvasStateWithCvData.ts`
  - keeps block content in sync with:
    - profile header fields
    - `cv.overrideSummary` / `profile.summary`
    - included library items
  - **tries not to overwrite user customizations**, e.g. header text is preserved if the user previously saved a non-empty header.
- Print route:
  - `frontend/app/(app)/cv/[id]/print/page.tsx` renders the canvas and triggers `window.print()`.

Backend validation:

- `backend/src/modules/cv/schemas.ts` includes a Zod schema for `canvasState` (blocks <= 12, text max 8000, etc.).

### 9) OpenAI key management (encrypted at rest)

- Backend (`backend/src/modules/openai/routes.ts`):
  - `GET /settings/openai`: returns `{hasKey, last4, updatedAt}` (never returns key)
  - `PUT /settings/openai`: validates and stores encrypted key
  - `DELETE /settings/openai`
- Encryption:
  - `backend/src/utils/crypto.ts` uses AES-256-GCM
  - requires `GGJ_ENCRYPTION_KEY` (base64(32 bytes))
- Frontend:
  - Settings → API Settings tab: `frontend/app/(app)/settings/page.tsx`

### 10) AI features (server-side OpenAI calls only)

All AI endpoints require:

- authenticated user
- user has saved an OpenAI key via `/settings/openai`

Implemented endpoints:

- `POST /ai/chat`
  - context-aware chatbot using profile + recent library + recent apps + some CV metadata
  - frontend UI: floating `frontend/components/Chatbot.tsx`
- `POST /ai/cv/optimize`
  - generates a professional summary (Structured Outputs)
  - writes summary to `CvDocument.overrideSummary`
- `POST /ai/cv/suggest`
  - **returns** a suggested summary + **suggested library item IDs** to include (Structured Outputs + server validation)
  - does not modify DB
- `POST /ai/cv/apply`
  - applies a suggestion atomically:
    - updates `overrideSummary`
    - optionally replaces inclusion selections
    - **also updates the SUMMARY block inside `canvasState`** if it exists

Where it’s implemented:

- Routes: `backend/src/modules/ai/routes.ts`
- OpenAI client helpers: `backend/src/services/openaiClient.ts`
- Prompts: `backend/src/ai/prompts/*`

---

## Important “gotchas” / known inconsistencies

- **API response shape is not fully uniform** across routes.
  - Workspace rule expects:
    - Success: `{ data: T, message?: string }`
    - Error: `{ statusCode: number, message: string, error?: string }`
  - Some endpoints currently return other shapes (e.g. `{ error, message }` or raw objects).
  - Before public launch, standardize responses and update frontend accordingly.
- **LocalStorage tokens** are convenient but not ideal for production security.
- Profile picture uploads are stored on local disk (`backend/uploads/...`); production deployment should use object storage (S3, R2, etc.) or a persistent volume.

---

## Pre-public / “ready for testers” TODO list (recommended)

These are the most common missing pieces that bite during external testing.

### Account & auth hardening (high priority)

- **Delete account (GDPR-style)**
  - Backend: `DELETE /account` (authenticated)
  - Should revoke all tokens, delete user row (cascade clears data), and delete stored profile picture files.
  - Frontend: Settings → “Danger zone” with confirmation.
- **Change password**
  - Backend: `POST /auth/change-password` (requires current password + new password)
  - Enforce same password strength rules as register.
  - Revoke all refresh tokens on success.
- **Logout endpoint(s)**
  - Backend:
    - `POST /auth/logout` (revoke current refresh token)
    - `POST /auth/logout-all` (revoke all refresh tokens)
  - Frontend: add logout action in sidebar/profile menu.
- **Password reset (email link)**
  - add reset token table (hashed tokens + expiry) + email delivery provider
  - endpoints:
    - `POST /auth/forgot-password`
    - `POST /auth/reset-password`
- **Email verification** (optional for testers, recommended for public launch)
  - verify token table + endpoints + UI state

### Token storage improvements (high priority for production, medium for testers)

- Move refresh token to **httpOnly cookie**.
- Consider also moving access token to memory (or short-lived cookie).
- If cookies: add **CSRF** protection (double submit or same-site strategy) and tighten CORS.

### Security / abuse prevention

- Expand rate limiting beyond auth routes:
  - AI endpoints should be heavily limited (cost control)
  - file uploads should be limited per user/IP
- Add **server-side request size limits** for large text fields (job posting, notes).
- Add audit logging for sensitive actions:
  - login, refresh, change password, delete account, set OpenAI key, AI calls
- Add basic **account lockout / backoff** for repeated failed logins.
- Add **OpenAI budget guardrails**:
  - per-user daily request limit
  - max tokens / max prompt sizes (already partially enforced)
  - “soft fail” UX when limit reached

### Data lifecycle / privacy

- **Export user data** (JSON download) for transparency.
- Add a clear privacy notice about:
  - what data is stored
  - how OpenAI is used
  - what is sent to OpenAI (job postings + user context)
- For AI: consider minimizing what gets sent (principle of least data).

### UX polish for testers

- Onboarding checklist in dashboard:
  - fill profile, add library items, create CV, create first application, (optional) set AI key
- Better empty states / calls to action across pages (some already exist).
- Add global “loading / error boundary” patterns (Next.js `error.tsx`, `loading.tsx` per route).
- Remove or gate “debug logging” in production builds (there are `console.log`/`console.error` in CV preview/snapshot pages and API client).

### CV / printing / export

- **PDF export pipeline**:
  - current approach relies on browser print → “Save as PDF”
  - consider server-side PDF generation later (Playwright/Puppeteer) for consistent output
- Add multi-page support in canvas editor (currently one A4 page).
- Add “snapshots should print” support (print route for snapshot canvas or snapshot template).

### Observability & release engineering

- CI workflow (tests + lint)
- Structured request logging + correlation IDs
- Centralized error tracking (Sentry or similar)
- Database migration strategy:
  - move from `prisma db push` to migrations before production
- OpenAPI/Swagger docs generation for API (helps external testers + future LLMs)

---

## If you’re an LLM implementing new features: project constraints

- **Never commit secrets**. Example values belong in `.env.example`.
- All backend env vars must use `GGJ_` prefix.
- All user-scoped DB queries must include `where: { userId: request.user.userId, ... }`.
- Input validation should be done with **Zod at the route level** (`schemas.ts` files).
- Prefer keeping “business logic” in services (like snapshots service) when it grows.

---

## Quick “where to change what” cheatsheet

- **Add a new backend feature module**: `backend/src/modules/<feature>/{routes.ts,schemas.ts}` and register in `backend/src/app.ts`.
- **Add a new frontend page**: `frontend/app/(app)/...` (authenticated) or `(auth)` (public).
- **Add a new API client method**: `frontend/lib/api.ts` and define types in `frontend/lib/types.ts`.
- **Modify the CV canvas editor**:
  - layout defaults: `frontend/components/cv/buildDefaultCanvasState.ts`
  - sync rules: `frontend/components/cv/syncCanvasStateWithCvData.ts`
  - drag/resize behavior: `frontend/components/cv/CvCanvasEditor.tsx`

