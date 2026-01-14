## Summary

Fixed app-wide “wonky” behavior caused by failing CORS preflight (OPTIONS) requests from the frontend (`http://localhost:3001`) to the backend (`http://localhost:3000`).

Root cause was an origin callback that **threw an Error** for disallowed origins, causing preflights to fail at the network layer and preventing the browser from surfacing usable responses/headers.

## Files changed

- `backend/src/plugins/security.ts`
- `backend/src/config/index.ts`

## Key decisions

- **Development behavior**
  - Allow any origin matching:
    - `^http://(localhost|127\.0\.0\.1)(:\d+)?$`
  - Plus any origins explicitly listed via `GGJ_CORS_ORIGINS`
  - Keep allowing **missing Origin** (same-origin / server-to-server)
  - Log rejected origins **only in development** for easier diagnostics

- **Production behavior**
  - Strict allowlist only: origins must match `GGJ_CORS_ORIGINS`
  - Missing Origin is still allowed
  - No “reject spam” logging in production

- **No exceptions on reject**
  - Replaced `cb(new Error(...), false)` with `cb(null, false)`
  - Rationale: throwing can break OPTIONS preflight in a way that looks like a network error; returning `false` cleanly omits CORS headers and lets the browser enforce policy.

## How to test (manual)

1. Start backend + frontend in development.
2. In the browser, open DevTools → Network.
3. Attempt login and load dashboard.
   - Confirm OPTIONS preflights no longer fail.
4. Optional CLI verification:
   - Preflight should succeed:
     - `OPTIONS /auth/login` with `Origin: http://localhost:3001`
   - A basic GET should include `access-control-allow-origin: http://localhost:3001`

## Verification performed

- Confirmed `OPTIONS http://localhost:3000/auth/login` with `Origin: http://localhost:3001` returns **204** with:
  - `access-control-allow-origin: http://localhost:3001`
  - `access-control-allow-credentials: true`
- Confirmed `GET http://localhost:3000/health` with `Origin: http://localhost:3001` includes `access-control-allow-origin`.

## Follow-ups (optional)

- Consider documenting recommended `GGJ_CORS_ORIGINS` values for local + Docker setups (e.g. include both `localhost` and `127.0.0.1` variants as needed).
