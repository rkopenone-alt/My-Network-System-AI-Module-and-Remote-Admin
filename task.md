# Phase 1: Database Schema Extensions
- `[/]` Create `sos_assignment_history` table in `system-backend/server.js`.
- `[/]` Create `sos_completion_log` table in `system-backend/server.js`.
- `[ ]` Add logging inserts for `sos_assignment_history` on assignment/accept/decline/ignore.
- `[ ]` Add logging inserts for `sos_completion_log` on mission completion.

# Phase 2: History API Refactor
- `[ ]` Update `/api/rescue-requests` logic to map `completed_by_rescuer_id` from `sos_completion_log`.
- `[ ]` Update `/api/users/:id/combined-history` to use `sos_completion_log` for the final completed state.

# Phase 3: Web Admin Popup Logic Fix
- `[ ]` Update Web Admin WebSocket `onmessage` in `system-backend/public/Web ADMIN.html` to auto-dismiss SOS popup (`closeModal('sosAlertModal')`) when status is not `'pending'`.
- `[ ]` Update `admin-app/htmlStr.js` with the same logic.

# Phase 4: Rescuer App Login Crash Fix
- `[ ]` Add fail-safes and null checks in `rescuer-app/htmlStr.js` (or `App.js`) login flow if IP is entered early before other states are ready.
