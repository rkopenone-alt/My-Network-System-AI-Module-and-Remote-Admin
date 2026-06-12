# Comprehensive History & Backend Stabilization Plan

The current platform logic incorrectly couples mission assignment history with the transient state of `rescue_requests` and `command_queue`. Because the system relies on overwriting `assigned_user_id` rather than maintaining a strict transactional log, race conditions and Admin closure actions can cause the wrong officer to be displayed as the "Final Completed Rescuer". Additionally, the Web Admin SOS popup does not correctly auto-dismiss when an SOS enters Live Command (e.g. `RESCUE_REQUEST_UPDATE` showing an assigned state), and the Rescuer APK crashes due to unsafe IP initialization during login.

We will rebuild this layer with a professional, production-ready structure.

## Proposed Changes

### 1. Database Schema Extensions (Audit & Lifecycle Tables)
We will implement dedicated mission lifecycle tracking tables in `server.js` to eliminate ambiguity:
- **`sos_assignment_history`**: Tracks every route, decline, ignore, and accept event.
  - Columns: `id`, `rescue_req_id`, `target_rescuer_id`, `action` ('assigned', 'accepted', 'declined', 'ignored', 'completed'), `timestamp`.
- **`sos_completion_log`**: Strictly tracks the *final* executor of a mission.
  - Columns: `id`, `rescue_req_id`, `completed_by_rescuer_id`, `completion_time`, `evidence_url`.
- Update `server.js` to securely write to these tables on every state change.

### 2. History API Refactor
- Update `/api/rescue-requests` and `/api/users/:id/combined-history` to fetch the **Final Completed Rescuer** from the `sos_completion_log` (or by selecting the last `completed` action from `sos_assignment_history`) instead of relying on the transient `assigned_user_id` in `rescue_requests`.
- This ensures only the *actual executor* is marked as the completing officer, while declined attempts remain purely in the audit logs.

### 3. Web Admin Popup Logic Fix
- In `Web ADMIN.html`, update the WebSocket `onmessage` handler for `RESCUE_REQUEST_UPDATE`, `RESCUE_REQUEST_ACCEPTED`, `RESCUE_REQUEST_IN_PROGRESS`, and `RESCUE_REQUEST_COMPLETED`.
- If a mission's state transitions out of `'pending'`, immediately trigger `closeModal('sosAlertModal')` and push it to the Live Command UI. 
- Ensure the popup *only* remains active if the status is purely `'pending'`.

### 4. Rescuer App Login Crash Fix
- In the Rescuer app (`login-rescuer.html` or equivalent), the initialization logic crashes if an IP is entered first before other fields due to null states or premature socket initialization.
- Implement strict validation and fail-safes during the login bootstrap sequence. Ensure `initWebSocket()` and `fetch()` calls verify input fields gracefully, use `try/catch` with safe await, and display loading/error states instead of crashing.

## Verification Plan
1. **Automated Setup:** Server reboot will dynamically instantiate `sos_assignment_history`.
2. **Lifecycle Test:** 
   - Trigger SOS. Officer-2 is assigned. Officer-2 declines.
   - Officer-1 is assigned. Officer-1 accepts and completes.
   - Verify History explicitly shows Officer-1 as executor. Officer-2 is only in the audit trail.
3. **Popup Test:** Verify the Web Admin popup automatically dismisses exactly when Officer-1 accepts.
4. **Crash Test:** Input IP address first in the Rescuer login screen to ensure no crashes occur.
