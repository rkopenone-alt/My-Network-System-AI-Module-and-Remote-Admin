# Rescue Backup AI - Workflow & Conversation History

This document serves as a persistent memory bank for the Antigravity agent, outlining major bugs fixed, architectural decisions made, and the overall flow of work for this project.

## Recent Major Fixes (June 2026)

### 1. AI Task Reassignment & Skipping Bug
**Issue:** When a task was reassigned, the AI engine was skipping certain rescuers (e.g., ID 2 would be skipped when the order should have been 4 -> 2 -> 1). Additionally, the web dashboard showed pending status while the rescuer device falsely sounded a siren notification without a task popup.
**Root Cause:**
- The database table `sos_assignment_history` was keeping records of previously "declined" or "ignored" tasks. When a task was reset to `pending`, the AI checked the history, saw the old "declined" status, and skipped the rescuer.
- The WebSocket server (`server.js`) was using a global `broadcast()` for `NEW_COMMAND` events. This caused *all* connected rescuer devices to receive the event and trigger the siren, even if the task was not actually assigned to them in the DB.
**Resolution:**
- Modified `server.js` to automatically clean up or ignore history entries for a task when it is reset to `pending`.
- Switched all command dispatches to use targeted WebSocket sends (`socketManager.send(deviceId, ...)` or `broadcastToAdminAndTarget()`), ensuring sirens only ring on the specifically assigned device.

### 2. Proximity AI Radius
**Feature:** Added a 50m minimum GPS radius constraint for the AI to assign the nearest rescuer first. If multiple rescuers are within that radius, the system is designed to handle them appropriately.

### 3. Build Script Packaging Metadata
**Issue:** The Admin APK and Public APK build scripts were retaining the metadata (App Name, Package ID) of the previously built app, causing installation conflicts (e.g., Admin App showing up as Public App).
**Resolution:**
- Updated `build_admin_apk.py` and `build_public_apk.py` to use explicit RegEx replacement (`re.sub`) for the `applicationId` in `build.gradle` and the `app_name` in `strings.xml`. This ensures every APK correctly identifies itself regardless of build order.

### 4. Port Conflicts (EADDRINUSE)
**Issue:** Node.js server occasionally failed to start with `EADDRINUSE: address already in use 0.0.0.0:3001`.
**Resolution:** This is a local development environment issue caused by a ghost Node process. The batch launcher should ideally run `taskkill /f /im node.exe` before starting the server to ensure a clean port bind.

## Portability & Network Usage
- The system is designed to be highly portable. The `.sqlite` database ensures data is contained locally.
- Mobile APKs have a manual IP entry feature. This means **APKs do not need to be rebuilt** when changing Wi-Fi networks or moving to a new PC. The user simply types the new local IP of the server into the mobile app interface.

*Last Updated: 2026-06-29*
