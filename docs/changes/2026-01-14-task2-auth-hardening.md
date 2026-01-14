## Summary

Added basic auth hardening endpoints for session invalidation and password changes, plus minimal frontend wiring to expose Logout and Change Password flows.

All endpoints use the standardized response envelope (or `204 No Content` where appropriate).

## Endpoints added

- `POST /auth/logout`
  - Authenticated
  - Revokes **only** the provided refresh token if it belongs to the current user
  - Idempotent: always returns `204 No Content`

- `POST /auth/logout-all`
  - Authenticated
  - Revokes **all** refresh tokens for the current user
  - Returns `204 No Content`

- `POST /auth/change-password`
  - Authenticated
  - Verifies `currentPassword`, updates `passwordHash`, revokes all refresh tokens
  - Returns `204 No Content`

## Files changed

### Backend

- `backend/src/modules/auth/schemas.ts`
  - Added `passwordSchema` to reuse the same strength rules as registration
  - Added `logoutSchema` and `changePasswordSchema`
- `backend/src/modules/auth/routes.ts`
  - Implemented `logout`, `logout-all`, and `change-password`

### Frontend

- `frontend/lib/api.ts`
  - Added `logout(refreshToken)`, `logoutAll()`, `changePassword(currentPassword, newPassword)`
- `frontend/components/AppShell/AppShell.tsx`
  - Logout action now calls `api.logoutAll()` best-effort, then clears local tokens and redirects to `/login`
- `frontend/app/(app)/settings/page.tsx`
  - Added a simple Change Password form (Current/New/Confirm) that logs the user out on success

## Key decisions

- **Idempotent logout**: `/auth/logout` returns `204` even for missing/invalid refresh tokens.
- **User-scoped revocation**: logout revokes refresh tokens only when `tokenHash` + `userId` match.
- **Force re-login after password change**: backend revokes refresh tokens; frontend logs out immediately to avoid confusion while an access token may still be valid briefly.
- **Reject reusing the same password**: change-password rejects when `newPassword === currentPassword` with a 400.

## How to test (manual)

1. Login on frontend.
2. Use **Logout** (top-right user menu).
   - Verify redirected to `/login`
   - Verify subsequent API calls fail until logging in again
3. Login again, go to **Settings → Profile → Security**.
4. Change password.
   - Verify you are logged out immediately
   - Verify login works with new password
   - Verify old password fails
5. Optional: in a second tab/session, confirm refresh/token usage fails after password change and user is forced to re-login.

## Follow-ups (optional)

- Add a dedicated “Security” tab in Settings if desired.
- Add server-side audit logging for password changes/logouts (intentionally out of scope here).
