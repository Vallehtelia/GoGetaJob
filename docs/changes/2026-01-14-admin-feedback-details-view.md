## Summary

Enhanced the Admin Feedback Inbox to support opening a feedback item for full details.

The inbox table still truncates long messages for scanability, but admins can now click a row (or the “View” button) to open a modal showing the full message and metadata.

## UI behavior

- Location: `/admin/feedback`
- Interaction:
  - Click a table row OR click the “View” button to open the details modal
  - Close via the Close button or clicking outside the modal
- Modal contents:
  - Type (badge)
  - Full created timestamp
  - User email + userId
  - Page path
  - Full message (scrollable, preserves whitespace)
  - User agent (shown in a scrollable area)
- Small utilities:
  - Copy buttons for `userId`, `pagePath`, and `message` (uses `navigator.clipboard`)

## Files changed

- `frontend/app/(app)/admin/feedback/page.tsx`

## How to test

1. Login as an admin user.
2. Navigate to `/admin/feedback`.
3. Click an item with a long message.
4. Confirm the modal shows the full message and metadata.
5. Close the modal and confirm the list remains usable.

## Follow-ups

- Add a compact tooltip on hover for message preview (optional).
- Add richer admin actions (status/triage/labels) in later phases.
