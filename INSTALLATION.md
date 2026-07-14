# Rescue Backup AI - Installation & Setup Guide

This guide provides instructions for setting up the Rescue Backup AI system on a new computer or server system.

## 1. Prerequisites Download Links

Before running the server or building the APKs, ensure the following software is installed on the target machine:

- **Node.js (v18+)**: [Download Node.js](https://nodejs.org/) (Required for the backend server and React Native dependencies).
- **Python (3.9+)**: [Download Python](https://www.python.org/downloads/) (Required for running the `sync_apps.py` and build scripts).
- **Java JDK (17)**: [Download JDK 17](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html) (Required for compiling the Android APKs).
- **Android Studio / Command Line Tools**: [Download Android Studio](https://developer.android.com/studio) (Required for Gradle and Android SDK).

*Note: Ensure you add Python, Node, and Java to your system's `PATH` environment variable during installation!*

## 2. Server Installation

1. Clone or copy the complete `Rescue Backup AI 09-06-2026` folder to your new local device.
2. Open a terminal or command prompt inside the `system-backend` folder.
3. Run the following command to install the necessary Node modules:
   ```bash
   npm install
   ```

## 3. Running the Server

To launch the backend server and the Web Admin panel, simply run the provided batch file in the root directory:

**`Start Web Admin.bat`**

Alternatively, you can run the server manually from the terminal:
```bash
cd system-backend
node server.js
```
The Web Admin panel will be available at `http://localhost:3000/Web ADMIN.html`.

## 4. Mobile App Setup (Optional)

If you need to compile fresh APKs for the mobile devices:
1. Ensure your machine is connected to the network (to detect the local LAN IP).
2. Open a terminal in the root folder.
3. Run the synchronizer to inject the latest HTML and IP settings:
   ```bash
   python sync_apps.py
   ```
4. Run the respective build scripts:
   - `python build_rescuer.py`
   - `python build_admin_apk.py`
   - `python build_public_apk.py`
