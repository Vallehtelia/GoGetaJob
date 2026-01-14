# Task 1 — Standardized API Response Envelope

## Goal

Backend responses are now consistent:

- **Success**: `{ data: T, message?: string }`
- **Error**: `{ statusCode: number, message: string, error?: string }`

Frontend API client is updated to:

- **On success**: unwrap and return `T` from `{ data }`
- **On error**: normalize legacy error shapes and throw a consistent `ApiClientError`

## Backend changes

### 1) Shared response helpers

Added `backend/src/utils/httpResponse.ts`:

- `ok(reply, data, message?)`
- `created(reply, data, message?)`
- `noContent(reply)` (204)
- `fail(reply, statusCode, message, error?)`

### 2) Global error + 404 formatting

Updated `backend/src/app.ts`:

- `setErrorHandler` always returns the standardized error object.
  - **statusCode**: `(error as any).statusCode ?? 500`
  - **error label**:
    - `ValidationError` for `ZodError`
    - `DatabaseError` for Prisma client errors
    - otherwise `error.name` or `InternalServerError`
  - **message**: generic in production for 5xx
- `setNotFoundHandler` returns `{ statusCode: 404, message: ..., error: 'NotFound' }`

### 3) Route module sweeps (success envelopes + standardized errors)

Updated modules to use `ok/created/noContent/fail` and removed ad-hoc `{ error, message }` and `{ details: ... }` responses:

- `backend/src/modules/auth/routes.ts`
- `backend/src/modules/applications/routes.ts`
- `backend/src/modules/profile/routes.ts`
- `backend/src/modules/library/routes.ts`
- `backend/src/modules/cv/routes.ts`
- `backend/src/modules/snapshots/routes.ts`
- `backend/src/modules/openai/routes.ts`
- `backend/src/modules/ai/routes.ts`
- `backend/src/modules/health/routes.ts`

Notable behavior choices:

- **DELETE endpoints** now prefer `204 No Content` via `noContent()` where safe (applications, CV delete, library deletes, snapshot deletes, OpenAI key delete).
- **AI “OpenAI key not set”** now uses error label `OpenAiKeyNotSet` (no extra `code` field).

### 4) Auth plugin unauthorized response

Updated `backend/src/plugins/auth.ts` to respond with:

- `fail(reply, 401, 'Invalid or expired token', 'Unauthorized')`

## Frontend changes

### 1) API client unwrapping + error normalization

Updated `frontend/lib/api.ts`:

- `handleResponse<T>()`
  - **204** → returns `undefined as T`
  - **success JSON** → if `{ data }` exists, returns `json.data`; otherwise returns `json` (legacy safety)
  - **error JSON** → expects `{ statusCode, message, error }`, and normalizes legacy `{ error, message }` into that shape
- Refresh flow:
  - `/auth/refresh` is parsed via the same unwrapping logic and then `setTokens()` uses `data.accessToken/data.refreshToken`
- Profile picture upload:
  - Parses standardized success envelope and returns `json.data`
- Removed a few client methods’ internal “double unwrap” patterns (many endpoints now simply call `this.request<T>()` and return `T` directly).

### 2) Types updated to reflect unwrapped returns

Updated `frontend/lib/types.ts` to remove response-level `message` fields that are no longer returned inside `data`:

- `AuthResponse`
- `SetOpenAiKeyResponse`
- `OptimizeCvResponse`

### 3) Small UI error-handling adjustments

To match standardized errors:

- `frontend/app/(app)/cv/[id]/page.tsx` and `frontend/components/Chatbot.tsx`
  - now detect missing OpenAI key via `errorData.error === 'OpenAiKeyNotSet'`
- `frontend/app/(auth)/register/page.tsx`
  - removed reliance on `err.details` (Zod details are no longer returned)

## Smoke checklist

- **register/login**
  - register works, tokens stored, dashboard redirect
  - login works, tokens stored, dashboard redirect
- **dashboard loads**
  - `/me` works
  - `/applications` list loads (paginated payload is now nested under envelope: `{ data: { data, pagination } }` but client unwrapping handles it)
- **create application**
  - POST `/applications` returns created application under `{ data }`
- **open CV list + open CV editor**
  - `/cv` list works
  - `/cv/:id` loads and renders editor
- **upload/delete profile picture**
  - upload returns updated profile under `{ data }`
  - delete returns updated profile under `{ data }`
- **optional: forced 401 refresh**
  - invalidate access token, trigger a request → client refreshes once via `/auth/refresh` and retries

