## Summary

Added basic abuse-prevention controls:

- **Stricter rate limits** on `/ai/*` endpoints (per-user where possible)
- **Request body size limits** on AI + large text payload routes
- **Standardized error responses** for rate limiting (`429`) and payload-too-large (`413`)
- Minimal frontend UX improvement: friendlier message when hitting `429` in AI UI

## Rate limiting

Rate limiting is enabled per-route (rate-limit plugin is registered with `global: false`).

### AI endpoints

Configured in `backend/src/modules/ai/routes.ts`:

- `POST /ai/chat`
  - `max: 20` per `10 minutes`
- `POST /ai/cv/suggest`
- `POST /ai/cv/optimize`
- `POST /ai/cv/apply`
  - each: `max: 10` per `10 minutes`

### Per-user keying

For AI routes, the rate-limit hook is set to `preHandler` and the key is derived from:

- `request.user.userId` (preferred, because auth has already run)
- fallback: `request.ip`

## Standardized error shapes

### 429 Too Many Requests

All rate limit exceed events return:

```json
{ "statusCode": 429, "message": "Too many requests", "error": "RateLimit" }
```

Implementation notes:

- The rate-limit plugin uses `errorResponseBuilder` to throw an error with `statusCode`.
- The global error handler in `backend/src/app.ts` maps any `statusCode === 429` to `error: 'RateLimit'`.

### 413 Request Too Large

Payloads exceeding body limits return:

```json
{ "statusCode": 413, "message": "Request too large", "error": "PayloadTooLarge" }
```

Implementation notes:

- Fastify raises `FST_ERR_CTP_BODY_TOO_LARGE` (status `413`) during body parsing.
- The global error handler maps this error code to the standardized envelope.

## Request body size limits

### AI endpoints

Configured in `backend/src/modules/ai/routes.ts`:

- `/ai/chat`: `256kb`
- `/ai/cv/*`: `512kb`

### Applications and CVs

Configured per-route:

- `POST /applications`: `256kb`
- `PATCH /applications/:id`: `256kb`
- `PATCH /cv/:id`: `512kb` (canvasState can be large)

## Frontend UX

- `frontend/components/Chatbot.tsx` and `frontend/app/(app)/cv/[id]/page.tsx`
  - Show a friendly message when `statusCode === 429`:
    - “You’re sending requests too quickly. Please wait a moment and try again.”

## Files changed

- `backend/src/plugins/security.ts`
- `backend/src/app.ts`
- `backend/src/modules/ai/routes.ts`
- `backend/src/modules/applications/routes.ts`
- `backend/src/modules/cv/routes.ts`
- `frontend/components/Chatbot.tsx`
- `frontend/app/(app)/cv/[id]/page.tsx`

## How to test (manual)

1. Restart backend.
2. Hit `/ai/chat` repeatedly until rate limit is exceeded → confirm `429` with standardized body.
3. Send an oversized JSON body to an AI route → confirm `413` with standardized body.
4. Verify normal AI usage still works under normal pace.

## How to tune

- Adjust per-route `config.rateLimit.max` / `timeWindow` in `backend/src/modules/ai/routes.ts`.
- Adjust per-route `bodyLimit` bytes in the corresponding route definitions.
