# 🛠️ Rescue Operations System — Tech Stack

---

## Backend — `system-backend`
- **Runtime:** Node.js
- **Framework:** Express.js v5
- **Database:** SQLite3
- **Real-time:** WebSockets (`ws`)
- **Auth:** JSON Web Tokens (`jsonwebtoken`) + bcryptjs
- **Other:** CORS

---

## Web Admin Dashboard — `web-admin`
- **Framework:** Vite (React-based SPA)
- **Language:** JavaScript
- **Map:** Leaflet.js
- **Real-time:** WebSocket client

---

## Mobile App — Rescuer Field (`rescuer-app`)
- **Framework:** React Native (bare Expo)
- **Runtime:** Expo SDK ~54
- **Maps:** react-native-maps
- **Language:** JavaScript

---

## Mobile App — Public SOS (`public-sos-app`)
- **Framework:** React Native (bare Expo)
- **Runtime:** Expo SDK ~54
- **Location:** expo-location
- **Language:** JavaScript

---

## Mobile App — Citizen Hub (`mobile-app`)
- **Framework:** React Native + Expo Router
- **Runtime:** Expo SDK ~54
- **Language:** TypeScript
- **Navigation:** React Navigation (Bottom Tabs)
- **Animations:** React Native Reanimated + Gesture Handler
- **Icons:** @expo/vector-icons

---

## Build & Deployment
- **Mobile Builds:** EAS (Expo Application Services)
- **Monorepo Orchestration:** `concurrently` (root `package.json`)
- **Database:** SQLite (local file-based `.db`)
