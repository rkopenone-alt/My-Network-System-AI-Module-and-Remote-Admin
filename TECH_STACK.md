# Rescue Operations System (ARDMS) - Technology Stack & Specifications

This document outlines the core technologies, application specifications, and hardware requirements for the Rescue Operations System (ARDMS).

## 1. Core Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3 (running in WAL mode for high concurrency)
- **Real-Time Communication**: Native `ws` WebSocket library
- **Frontend Architecture**: Single Page Applications (SPAs) built with HTML, CSS, and Vanilla JavaScript.
- **Mobile App Framework**: React Native (specifically leveraging `react-native-webview` to wrap the frontend SPAs).

## 2. Application Ecosystem & APKs

The system is deployed across three distinct applications. All mobile apps are packaged as standard Android APKs wrapping the core HTML/JS interfaces.

### A. Public SOS App (`preview-mobile-app.html` -> `Public_SOS_App.apk`)
- **Purpose**: For citizens to raise SOS alerts, send live geolocation, and upload audio/image evidence.
- **Media Optimization**: Features a client-side compression engine ensuring final image payloads are max 200KB and audio recordings are max 100KB, drastically improving reliability over poor 3G/4G networks.
- **GPS Architecture**: Forces a high-accuracy, un-cached satellite `navigator.geolocation.getCurrentPosition` read upon SOS trigger.

### B. Rescuer Field App (`preview-rescuer.html` -> `Rescuer_Rescue_App.apk`)
- **Purpose**: For field operatives to receive AI-assigned tasks, accept/decline missions, and stream live GPS back to headquarters.
- **Navigation Engine**: Integrates Mapbox GL JS for dynamic routing and offline map tile caching.

### C. Admin & Command Center App (`raw_admin.html` -> `Admin_Rescue_App.apk` / `Web ADMIN.html`)
- **Purpose**: A comprehensive dashboard for dispatchers to view live tracking, AI assignments, and real-time statistics. Operates both as a Web App (in browsers) and an Android APK (for tablet commanders).
- **Auto-Refresh**: All configuration changes (like interval tweaks) trigger automatic WebSocket UI refreshes instantly across all connected Admin panels.

## 3. Hardware & OS Requirements for Mobile APKs

### Rescuer App
- **OS Requirement**: Android 7.0 (Nougat) or higher
- **RAM**: Minimum 2 GB
- **CPU**: Quad-Core Processor (1.4 GHz or higher)
- **Permissions Required**: Foreground & Background Location (GPS), Camera, Microphone, Network Access.

### Public App
- **OS Requirement**: Android 7.0 (Nougat) or higher
- **RAM**: Minimum 2 GB
- **CPU**: Quad-Core Processor (1.4 GHz or higher)
- **Permissions Required**: Location (GPS), Camera, Microphone, Network Access.

### Admin App (Tablet/Mobile)
- **OS Requirement**: Android 8.0 (Oreo) or higher
- **RAM**: Minimum 3 GB (4 GB recommended for rendering heavy map layers and multiple markers)
- **CPU**: Octa-Core Processor recommended.
- **Permissions Required**: Network Access, Storage (for downloading logs).
