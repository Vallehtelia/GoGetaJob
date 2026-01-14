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

