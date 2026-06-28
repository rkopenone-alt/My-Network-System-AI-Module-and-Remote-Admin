# Rescue Backup AI Project Workflow

## File Locations
- **Web Admin HTML**: `system-backend/public/Web ADMIN.html`
- **Rescuer App HTML**: `preview-rescuer.html`
- **Public App HTML**: `preview-mobile-app.html`
- **Admin App HTML**: `raw_admin.html`
- **Backend Server**: `system-backend/server.js`

## Build & Compile Process
If you modify `preview-rescuer.html`, `preview-mobile-app.html`, or `raw_admin.html`, you MUST recompile them into APKs using the provided python scripts in the root directory:
1. First, synchronize the apps by running: `python sync_apps.py`
2. Next, depending on the app you modified, run its respective build script:
   - For Rescuer App: `python build_rescuer.py`
   - For Public App: `python build_public_apk.py`
   - For Admin App: `python build_admin_apk.py`
   - Or you can build all at once (if applicable).
3. Wait for the Python build commands to fully execute. Note: Do NOT compile the Admin APK unless explicitly requested by the user.

## Code Pushing
After completing UI changes, fixes, or modifying workflows:
1. Always run `git add .` and `git commit -m "[Your commit message]"`.
2. Push your changes to GitHub using `git push`.
3. If the user specifies a commit message in their prompt, use it EXACTLY as provided.

## Known Architecture & Quirks
- **Caching in WebView**: In the mobile apps (`preview-rescuer.html`), `fetch()` calls are notoriously cached by the React Native WebView. Always append a cache-buster query parameter (e.g., `?_t=${Date.now()}`) to `fetch` URLs (like `/combined-history`) when fetching fresh data from the server.
- **Task Reassignment UI**: When dealing with UI element states (e.g., hiding completed tasks, handling task reassignments), rely on explicit filters like `t.status !== 'completed' && t.status !== 'reassigned'`.
- **UI Overflow**: When working with `.actionable-actions` or similar flex containers with buttons, remember to include `flex-wrap: wrap;` so that UI elements don't overflow out of the card.
- **Mangled Characters**: If encountering weird text like `ï¸ `, it is likely a corrupted UTF-8 emoji or icon character. Replace it cleanly with the plain text or correct Lucide icon.

## Backend AI Engine & WebSocket Rules
- **Task Reassignment Logic**: The AI assignment loop must ensure that if a task is reset to `pending`, any existing entries in `sos_assignment_history` for that task are cleared or ignored. Otherwise, rescuers will be falsely skipped on reassignment.
- **WebSocket Broadcasts**: Do not use generic `broadcast()` for `NEW_COMMAND`. Use `socketManager.send(deviceId, ...)` or `broadcastToAdminAndTarget()` to ensure only the assigned rescuer gets the task and siren popup.
- **Proximity AI**: The assignment system prioritizes rescuers within a 50m radius of the emergency. If multiple rescuers are within that radius, they can be processed based on distance or assigned concurrently depending on the strategy.
- **App IP Configurations**: Mobile APKs use a manual IP entry system to connect to the backend. Rebuilding the APKs is NOT required when changing Wi-Fi networks; the user only needs to type the new IP address into the app interface.
