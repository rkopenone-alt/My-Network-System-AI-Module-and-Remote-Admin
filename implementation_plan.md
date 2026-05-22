# Implementation Plan - Notification Log & Mobile SOS Buttons Update

This plan addresses a critical layout gap in the Rescue Management System's Admin Dashboard and refines the SOS workflow in the Public Mobile App to align with user needs.

## Proposed Changes

### Web Admin Dashboard

#### [MODIFY] [preview-web-admin.html](file:///c:/Users/Alienware/Desktop/Rescue%20Backup%2026-04-2026/preview-web-admin.html)
*   **Column Layout Update**: Add a third column: `COLUMN 3: TACTICAL CLUSTERS` in the Notification Log page container (`page-notif-mgmt`).
*   **CSS Styles**:
    *   Change the width of Column 1 (`mgmtListCritical`), Column 2 (`mgmtListNormal`), and the new Column 3 to `23%` (down from `30%`), allowing the Detail View (`mgmtDetailPanel`) to occupy the remaining 31% width responsively.
    *   Style Column 3 using the purple theme variables (`--special`: `#a855f7` and active purple background `#faf5ff`).
*   **Javascript Logic (`updateMgmtPage`)**:
    *   Clear the new Column 3 (`mgmtListGrouped`) during refresh.
    *   Retrieve all active groups (`groupedTasks` where status is not `Closed`).
    *   Append them to Column 3 using `createMgmtItem(grp, true)`.
    *   Update both `mgmtCountGrouped` and the badge counter properly.

---

### Public Mobile App

#### [MODIFY] [App.js](file:///c:/Users/Alienware/Desktop/Rescue%20Backup%2026-04-2026/public-sos-app/App.js)
*   **Emergency Type Buttons Update**:
    *   In the `SOSTriggerScreen` priority selection section, replace the Critical and Medical support buttons ("Pregnancy Support" and "Medical Support") with **"General SOS"** (icon `📢`, type `'sos'`) and **"Emergency Supplies Needed"** (icon `📦`, type `'supplies'`).
    *   Change the section label from `PRIORITY MEDICAL BYPASS` to `SELECT SOS CATEGORY`.
*   **Urgency & Priority Alignment**:
    *   Ensure that triggering requests via this screen sets `urgency: 'normal'` and `priority: 'Normal'` in the JSON payload, satisfying the requirement that they fall under the normal SOS category.
*   **Styling Tweaks**:
    *   Change button styles to use warm orange/amber borders (`#fcd34d`) and active background (`#fef3c7`) instead of critical red, matching the "Normal SOS" color theme.

---

### Production Build

#### [BUILD] Production Ready APK
*   Build the updated Expo application to verify the bundle and package a clean production APK in the `Output_APKs` directory.

---

## Verification Plan

### Automated & Manual Tests
*   Run the local backend and test the POST payload for Normal SOS alerts to confirm `urgency` and `priority` fields are saved as `normal` / `Normal`.
*   Open the Web Admin panel in a browser to verify Column 3 appears and lists tactical clusters properly.
*   Verify that selecting a cluster displays all clustered requests inside the detail view.
