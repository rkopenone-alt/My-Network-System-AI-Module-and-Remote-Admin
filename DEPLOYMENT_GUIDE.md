# Rescue Operations System (ARDMS) - Deployment Guide

This document exclusively covers the setup, network configuration, and compilation protocols for the ARDMS emergency management network.

## 1. Prerequisites
Ensure the host deployment machine (Local Server) has the following installed:
- **Node.js**: Version 18+ (for the backend server)
- **Python**: Version 3.8+ (for synchronization and build automation scripts)
- **Java Development Kit (JDK)**: Version 17 (Required by React Native/Gradle)
- **Android SDK**: Available via Android Studio (with environment variables `ANDROID_HOME` correctly set)

## 2. Setting Up the Local Backend
1. **Initialize Dependencies**:
   Navigate to the `system-backend` directory and install NPM packages:
   ```bash
   cd system-backend
   npm install
   ```
2. **Launch the Server**:
   ```bash
   node server.js
   ```
   The backend will auto-detect the local Wi-Fi/LAN IP address (e.g., `192.168.x.x`) and bind to it. It will also serve the static Web Admin dashboard at `http://<IP_ADDRESS>:3000`.

## 3. Synchronizing Frontend Edits
The React Native mobile apps directly wrap HTML files located in the root directory. If you modify `preview-mobile-app.html`, `preview-rescuer.html`, or `raw_admin.html`, you MUST synchronize these files into the React Native build pipeline before compiling.

Run the synchronization script from the root project directory:
```bash
python sync_apps.py
```
This script will parse the HTML, inject the detected Local IP Address into the JavaScript payloads, and copy them into the respective React Native project folders as `htmlStr.js`.

## 4. Compiling the APKs
After synchronization, you can compile the APKs using the provided automated Python scripts. These scripts orchestrate Gradle and React Native CLI commands.

- **Build Public App**:
  ```bash
  python build_public_apk.py
  ```
- **Build Rescuer App**:
  ```bash
  python build_rescuer.py
  ```
- **Build Admin App**:
  ```bash
  python build_admin_apk.py
  ```
*(Note: Compiling the Admin APK is only necessary if you require tablet deployments for commanders. Otherwise, they can just use the Web Admin via a browser).*

Upon successful completion, the compiled, release-ready APKs will be automatically moved to the `Output_APKs/` directory.

## 5. Network Reconnection & App Configurations
All compiled APKs feature an offline-capable manual IP entry system.
- If the central backend server changes its Wi-Fi network (and therefore its IP address), **you do not need to recompile the APKs**.
- Operators and citizens can simply tap the server connection status icon in the app, type the new backend IP address, and seamlessly reconnect to the websocket pipeline.
