2026-01-14

Task 2 completed: logout/logout-all/change-password with standardized envelopes; minimal UI wiring added and tested.

Next prioritized tester-readiness task: Task 3 (delete account) to support GDPR-style cleanup and reduce tester support overhead.

Key risks to manage in Task 3: safe on-disk file deletion (no traversal) + best-effort cleanup + ensure user is fully logged out afterward.
----------------------------------------------------------------------

2026-01-14

Added future backlog items (not priority now):

In-app feedback entry point (dashboard or global UI) for bugs/feature requests.

2FA option.

Forgot-password / email reset flow (especially for users without 2FA).
----------------------------------------------------------------------

2026-01-14

Task 3 completed: DELETE /account + safe upload deletion helper + Settings “Danger Zone” UI; verified cascade deletion and file cleanup.

Next tester-readiness task selected: Task 4 (AI abuse prevention + request size limits) to control cost and prevent oversized payload instability.

Backlog reminders recorded: in-app feedback entry point, 2FA, forgot-password email reset (not priority now).
----------------------------------------------------------------------

2026-01-14

Task 4 completed: AI rate limiting + payload limits + standardized 429/413 errors + friendlier frontend messaging on 429.

Pending manual verification: ensure AI rate limiting is truly per-user (two-account test across separate browser profiles).

Backlog continues to include: in-app feedback entry point, 2FA, forgot-password email reset (not priority now).
----------------------------------------------------------------------

Process tracking update (append-only)

2026-01-14

Confirmed AI rate limiting behaves per-user (manual verification).

Next feature agreed: Feedback MVP (authenticated-only, global entry point, DB storage).

Admin dashboard + analytics/time-on-site acknowledged as future work; will be planned and delegated as separate Cursor tasks after feedback ships.
----------------------------------------------------------------------

2026-01-14

Feedback feature shipped and verified end-to-end (submission + DB persistence).

Next candidate epic identified: Admin view + analytics/activity tracking.

Plan: implement admin gating first, then an admin feedback inbox, then optional activity tracking MVP.
----------------------------------------------------------------------

2026-01-14

Confirmed plan sequence: implement Admin Phase 1–2 now (admin gating + feedback inbox), then Phase 3–4 later (activity tracking + admin analytics dashboard).

Delegated Phase 1–2 with tight scope:

DB field User.isAdmin

server-enforced requireAdmin guard

admin feedback list endpoint with filters + pagination

admin UI page hidden from non-admin users and backed by server 403 enforcement.
----------------------------------------------------------------------

2026-01-14

Admin Phase 1–2 shipped: admin gating + admin feedback inbox with filters/pagination.

Next UX improvement identified: add a feedback details view so long messages are fully readable (row click → modal/drawer), without expanding scope into moderation/triage yet.
----------------------------------------------------------------------

2026-01-14

Admin Phase 1–2 completed (admin gating + feedback inbox) and enhanced with a feedback details modal.

Proceeding to Admin Phase 3–4:

Phase 3: lightweight internal activity tracking (sessions + page views) with low write volume and privacy-conscious fields.

Phase 4: admin analytics dashboard consuming aggregated metrics (DAU, sessions, page views, avg session length, 7-day trends), fully admin-gated server-side and hidden in UI for non-admins.
----------------------------------------------------------------------

