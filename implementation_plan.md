# Admin APK Fixes & Rescuer App Separation

This plan resolves the critical bugs in the Admin APK (blank Operations page, non-functional manual IP configuration, and non-functional AI toggles) and fixes the incorrect packaging that caused the Rescuer App to build as the Admin APK.

## User Review Required

> [!IMPORTANT]
> The Rescuer App was wrongly compiled as the Admin APK because:
> 1. `rescuer-app/App.js` and `rescuer-app/app.json` on the disk were committed with the Admin App's logic and config, causing `build_rescuer.py` to package the Admin App as the Rescuer App.
> 2. Gradle caches Metro JS bundling results, preventing asset files from updating correctly when switching apps during builds.
> We will restore the Rescuer App's code in `rescuer-app/App.js` (removing the native Admin Login and Network Configuration screens and going straight to the WebView), restore its `app.json`, and ensure all future builds run Gradle clean tasks to bypass caches.

> [!IMPORTANT]
> To fix the blank Operations page and broken Manual IP configuration:
> 1. We will dynamically inject the `serverIp` into the HTML string in the React Native WebView wrapper for both apps. This bypasses origin-isolated `localStorage` and `hostname` lookups inside the WebView.
> 2. We will add `key={serverIp}` to the React Native WebViews to force a clean remount when the server IP configuration changes, ensuring immediate reconnect.

## Proposed Changes

---

### Rescuer App configuration (`rescuer-app/app.json`)

Restore the Rescuer Field App metadata.

#### [MODIFY] [app.json](file:///c:/Users/Alienware/Desktop/Rescue%20Backup%20AI%2009-06-2026/rescuer-app/app.json)
- Set name to `"Rescuer Field App"`.
- Set slug to `"rescuer-app"`.
- Set android package to `"com.rescue.rescuer"`.
- Set icon and adaptive icon background color to `#1e40af` (Rescuer blue).

---

### Rescuer App wrapper (`rescuer-app/App.js`)

Remove the native admin login/network setup screen from the Rescuer App wrapper and make it load the Rescuer WebView directly, while preserving GPS tracking, photo capture, and PDF sharing features.

#### [MODIFY] [App.js](file:///c:/Users/Alienware/Desktop/Rescue%20Backup%20AI%2009-06-2026/rescuer-app/App.js)
- Change default `appState` to `'DASHBOARD'`.
- Remove native login and network setup rendering blocks.
- Perform regex replacement on `htmlString` to inject `const finalIp = '${serverIp}';` dynamically before loading the WebView.
- Add `key={serverIp}` to the WebView component so it remounts on IP change.
- Restore the `!hasPermission` check to warn users if location permissions are disabled.

---

### Admin App wrapper (`admin-app/App.js`)

Implement dynamic `serverIp` injection and sync listeners to reload the WebView instantly when the manual IP configuration is updated.

#### [MODIFY] [App.js](file:///c:/Users/Alienware/Desktop/Rescue%20Backup%20AI%2009-06-2026/admin-app/App.js)
- Perform regex replacement on `htmlString` to inject `const SERVER_IP = '${serverIp}';` dynamically before loading the WebView.
- Add the `useEffect` that listens to `serverIp` updates to trigger native WebView reloading.
- Ensure `key={serverIp}` is set on the WebView for remounting on IP updates.

---

### Build and Package Scripts (`build_admin_apk.py` & `build_rescuer.py`)

Ensure Gradle/Metro caches are bypassed to prevent the apps from merging incorrectly.

#### [MODIFY] [build_admin_apk.py](file:///c:/Users/Alienware/Desktop/Rescue%20Backup%20AI%2009-06-2026/build_admin_apk.py)
#### [MODIFY] [build_rescuer.py](file:///c:/Users/Alienware/Desktop/Rescue%20Backup%20AI%2009-06-2026/build_rescuer.py)
- Ensure the build clean commands run cleanly.
- Verify Metro builder is triggered without caching.

## Verification Plan

### Automated Tests
- No automated unit tests available.

### Manual Verification
1. Run `python sync_apps.py` to synchronize all asset configurations.
2. Build the Rescuer APK: `python build_rescuer.py`. Verify that the built `Rescuer_App_Rescue_AI.apk` loads the Rescuer App interface directly (no native Admin Login screen).
3. Build the Admin APK: `python build_admin_apk.py`. Verify that the built `Admin_App_Rescue.apk` runs the Admin App and opens to the Admin Login screen.
4. Install both APKs on devices/emulators.
5. In the Admin App, change the manual server IP and save it. Verify that it reloads instantly and connects successfully.
6. Verify the Operations page is populated with data from the backend.
7. Toggle "Autonomous Routing" and verify that it updates on the backend.
