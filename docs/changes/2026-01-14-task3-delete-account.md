## Summary

Implemented GDPR-style account deletion with best-effort local file cleanup and a “Danger Zone” UI in Settings.

Deleting an account:

- revokes refresh tokens for the user
- deletes the user (Prisma cascade removes dependent records)
- attempts to remove the profile picture file from disk (safe, traversal-proof, best-effort)
- logs the user out on the frontend

## Endpoint added

- `DELETE /account`
  - Authenticated (`fastify.authenticate`)
  - Returns `204 No Content`

## Backend files changed

- `backend/src/modules/account/routes.ts` (new)
  - Implements `DELETE /account`
  - Uses a Prisma transaction to:
    - revoke refresh tokens (`refreshToken.updateMany`)
    - delete the user (`user.delete`)
  - Deletes profile picture file after DB deletion (best-effort)

- `backend/src/utils/fileDeletion.ts` (new)
  - `safeDeleteUploadByUrl(url)`
  - Safety notes:
    - Only accepts URLs starting with `/uploads/`
    - Resolves under `process.cwd()/uploads`
    - Ensures resolved file path remains within the uploads directory (prevents `../` traversal)
    - Swallows errors (ignores missing files)

- `backend/src/app.ts`
  - Registers the new `accountRoutes` module

## Frontend files changed

- `frontend/lib/api.ts`
  - Adds `deleteAccount(): Promise<void>` calling `DELETE /account`

- `frontend/app/(app)/settings/page.tsx`
  - Adds a “Danger Zone” section under Profile tab:
    - requires typing `DELETE`
    - shows `ConfirmDialog` before final deletion
    - calls `api.deleteAccount()` then always runs `logout()` (best-effort)

## How to test (manual)

1. Register + login.
2. Upload a profile picture.
3. Create at least one Application and one CV.
4. Settings → Profile → Danger Zone:
   - type `DELETE`
   - confirm deletion
5. Verify you are redirected to `/login` and local tokens cleared.
6. Try logging in again with the same credentials → should fail.
7. Optional: verify the profile picture file under `uploads/profile-pictures/` is removed.

## Follow-ups (optional)

- Reuse `safeDeleteUploadByUrl()` in `/profile/picture` delete endpoint so that manual picture deletion also removes the file on disk.
- Consider adding a “Download my data” export endpoint (explicitly out of scope here).
