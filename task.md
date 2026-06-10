# Tasks - `[x]` **Phase 1: App Icon Update**
  - `[x]` Create `generate_admin_icon.py` to build a solid green icon.
  - `[x]` Overwrite `admin-app/assets/icon.png`, `splash-icon.png`, and `adaptive-icon.png`.

- `[x]` **Phase 2: IP Address & Remote Control Fixes**
  - `[x]` Update `WebView` `baseUrl` in `admin-app/App.js` to use dynamic `serverIp`.
  - `[x]` Add "Local Emulator (10.0.2.2)" button to the Network Setup screen in `admin-app/App.js`.

# Tasks - Media Upload Fixes & Compression
- [x] Integrate local image compression inside native applications using `expo-image-manipulator`
  - [x] Implement `compressAndAttachImage` helper in `public-sos-app/App.js` (max 200KB)
  - [x] Apply compression to RequirementsScreen camera/gallery in `public-sos-app`
  - [x] Apply compression to CriticalSOSScreen camera/gallery in `public-sos-app`
  - [x] Enforce max 100KB limit on voice recordings in `public-sos-app`
  - [x] Implement image compression in `rescuer-app/App.js` (max 200KB, single image)
- [x] Implement client-side HTML canvas-based compression in `preview-mobile-app.html`
  - [x] Add `_compressImage` method to `preview-mobile-app.html`
  - [x] Update `handleSOSImage` and `handlePhoto` to compress images to max 200KB
- [x] Fix real-time Admin Reply message routing in backend
  - [x] Replace broken broadcast logic in `system-backend/server.js` with direct `socketManager.send`
  - [x] Save reply messages as standard row in database `notifications` table for `/api/sync` support
- [x] Align Web Admin media viewing
  - [x] Add `formatMediaUrl` helper to `preview-web-admin.html`
  - [x] Apply `formatMediaUrl` to all image elements
  - [x] Fix potential null-pointer crash on evidence container click
- [x] Compile and generate native APK
  - [x] Run Gradle compiler `assembleRelease` inside `public-sos-app/android`
  - [x] Place generated APK in workspace root (under `Output_APKs/`)
  - [x] Run Gradle compiler `assembleRelease` inside `rescuer-app/android`
  - [x] Place generated rescuer APK in workspace root (under `Output_APKs/`)

## Phase 2: AI Engine Implementation (Backend)
- [x] Inject `runAIAssignment` logic into `system-backend/server.js`.
- [x] Hook AI logic to `POST /api/rescue-requests` (new incident triggers).
- [x] Hook AI logic to `PUT /api/rescue-requests/:id/status` (completion triggers).
- [x] Add REST endpoints (`/api/ai/toggle`, `/api/users/:id/ai`, `/api/groups/:id/ai`) for Admin configuration.

## Phase 3: Admin Web App & AI Control Hooks
- [x] Add "Enable AI Routing" toggle into `Web ADMIN.html` top header.
- [x] Wire up toggles via WebSocket and fetch calls to backend.
- [x] Inject AI enablement checkboxes into existing User and Group configuration modals.

## Phase 4: Native Android Admin Application (Offline-first Wrapper)
- [x] Clone `rescuer-app` template into `admin-app` directory.
- [x] Bundle `Web ADMIN.html` into `admin-app/htmlStr.js`.
- [x] Inject offline `fetch` interceptor script into `htmlStr.js` to queue commands (POST/PUT/DELETE) into `localStorage` when offline.
- [x] Sync queued commands when network connection is restored (`window.addEventListener('online', ...)`).
- `[x]` Rebrand Expo configurations (`app.json`, `App.js`) to `AntiGravity Admin`.

## Phase 5: APK Generation
- `[x]` Run Gradle compiler `assembleRelease` inside `admin-app/android`
- `[x]` Place generated Admin APK in workspace root (under `Output_APKs/`)
