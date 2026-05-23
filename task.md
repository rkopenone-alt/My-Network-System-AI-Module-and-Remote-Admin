# Task Checklist - Grouped Mission Coordinate & Routing Fix

- [ ] Implement Web Admin Dashboard Fixes (`preview-web-admin.html`)
  - [ ] Implement persistent selection state (`window.bulkSelectedIds`) when opening group creation pane
  - [ ] Update `confirmBulkGrouping()` to read from persistent selection state
  - [ ] Add safety validation guard for empty selections in `confirmBulkGrouping()`
  - [ ] Enrich `command_payload` in `confirmBulkGrouping()` with full `missions` coordinate array
  - [ ] Enrich `command_payload` in `confirmTaskGrouping()` with full `missions` coordinate array
- [ ] Implement Mobile Rescuer App Fixes (`preview-rescuer.html`)
  - [ ] Update `startMission()` validation to resolve empty center coordinates using the first mission's coordinates
- [ ] Production Compilation & Deployment
  - [ ] Sync web changes to bundles: run `python generate_html_str.py`
  - [ ] Compile the React Native Android project: run Gradle build in `rescuer-app/android`
  - [ ] Copy the compiled APK to `Output_APKs/`
- [ ] Verification & Testing
  - [ ] Deploy test server and verify new database dispatches
  - [ ] Manually verify map plots correctly in Mobile Rescuer App
