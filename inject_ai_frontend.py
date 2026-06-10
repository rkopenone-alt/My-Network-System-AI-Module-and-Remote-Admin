import os

filepath = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\system-backend\public\Web ADMIN.html"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Chunk 1
target1 = """                </div>
            </div>

            <!-- Bottom Actions -->"""
replace1 = """                </div>
            </div>

            <!-- AI Routing Toggle (Ops Hub) -->
            <div style="margin-top: 24px; padding: 16px; border-radius: 12px; border: 1px solid var(--border); background: #f8fafc;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">AI Decision Engine</span>
                    <div id="hubAiStatusBadge" style="display:flex; align-items:center; gap:4px; font-size:10px; font-weight:800; color:var(--text-muted);">
                        <span style="width:6px; height:6px; background:var(--text-muted); border-radius:50%; display:inline-block;"></span> OFFLINE
                    </div>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <span style="font-size: 13px; font-weight: 700; color: var(--text-main);">Autonomous Routing</span>
                    <label style="position: relative; display: inline-block; width: 34px; height: 20px;">
                        <input type="checkbox" id="hubAiToggle" onchange="toggleGlobalAI(this.checked)" style="opacity: 0; width: 0; height: 0;">
                        <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px;" id="hubAiSlider"></span>
                    </label>
                    <style>
                        #hubAiToggle:checked + span { background-color: #22c55e; }
                        #hubAiSlider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                        #hubAiToggle:checked + #hubAiSlider:before { transform: translateX(14px); }
                    </style>
                </div>
            </div>

            <!-- Bottom Actions -->"""
if target1 in content and "hubAiToggle" not in content:
    content = content.replace(target1, replace1)

# Chunk 2
target2 = """                            'NEW_RESCUE_REQUEST', 'RESCUE_REQUEST_ACCEPTED', 'RESCUE_REQUEST_DECLINED',
                            'RESCUE_REQUEST_UPDATE', 'COMMAND_STATUS_UPDATE', 'RESCUE_REQUEST_COMPLETED',
                            'SOS_ALERT', 'RESCUER_UPDATE', 'NEW_COMMAND'
                        ];

                        if (updateTypes.includes(data.type)) {"""
replace2 = """                            'NEW_RESCUE_REQUEST', 'RESCUE_REQUEST_ACCEPTED', 'RESCUE_REQUEST_DECLINED',
                            'RESCUE_REQUEST_UPDATE', 'COMMAND_STATUS_UPDATE', 'RESCUE_REQUEST_COMPLETED',
                            'SOS_ALERT', 'RESCUER_UPDATE', 'NEW_COMMAND', 'AI_STATUS_UPDATE'
                        ];

                        if (data.type === 'AI_STATUS_UPDATE') {
                            handleAIStatusUpdate(data.data.enabled);
                            return; // Only update UI, avoid full refresh
                        }

                        if (updateTypes.includes(data.type)) {"""
if target2 in content and "'AI_STATUS_UPDATE'" not in content:
    content = content.replace(target2, replace2)

# Chunk 3
target3 = """            checkDetectedIp();
            setInterval(checkDetectedIp, 5000);

            try { initWebSocket(); } catch (e) { console.error("WS Init Error", e); }"""
replace3 = """            checkDetectedIp();
            setInterval(checkDetectedIp, 5000);

            try { loadAISettings(); } catch (e) { console.error("AI Settings Init Error", e); }

            try { initWebSocket(); } catch (e) { console.error("WS Init Error", e); }"""
if target3 in content and "loadAISettings()" not in content:
    content = content.replace(target3, replace3)

# Chunk 4
target4 = """        function closeFromMgmt(id, isGroup) {
            if (isGroup) {
                closeTaskByAdmin(id);
            }
        }

        // --- TESTING SUITE REMOVED ---"""
replace4 = """        function closeFromMgmt(id, isGroup) {
            if (isGroup) {
                closeTaskByAdmin(id);
            }
        }

        // --- AI SETTINGS INTEGRATION ---
        async function loadAISettings() {
            try {
                const res = await fetch(`${API_BASE_URL}/api/ai/toggle`);
                const data = await res.json();
                handleAIStatusUpdate(data.enabled);
            } catch (e) {
                console.error('Failed to load AI settings:', e);
            }
        }

        async function toggleGlobalAI(enabled) {
            const confirmed = confirm(enabled 
                ? "WARNING: Enabling AI routing will allow the system to autonomously assign rescue tasks to active units. Confirm?" 
                : "Disabling AI will revert the system to manual dispatch mode. Confirm?");
            
            if (!confirmed) {
                handleAIStatusUpdate(!enabled);
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/ai/toggle`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled })
                });
                const data = await res.json();
                if (data.success) {
                    showAdminToast(enabled ? "AI Routing ENABLED" : "AI Routing DISABLED", "success");
                    handleAIStatusUpdate(enabled);
                }
            } catch (e) {
                console.error('Failed to toggle AI:', e);
                showAdminToast("Failed to connect to AI Engine", "error");
                handleAIStatusUpdate(!enabled);
            }
        }

        function handleAIStatusUpdate(enabled) {
            const globalToggle = document.getElementById('globalAiToggle');
            const globalBadge = document.getElementById('globalAiBadge');
            const hubToggle = document.getElementById('hubAiToggle');
            const hubBadge = document.getElementById('hubAiStatusBadge');

            if (globalToggle) globalToggle.checked = enabled;
            if (hubToggle) hubToggle.checked = enabled;

            const badgeHtml = enabled 
                ? `<span style="width:6px; height:6px; background:#22c55e; border-radius:50%; display:inline-block; box-shadow: 0 0 8px #22c55e;"></span> ACTIVE` 
                : `<span style="width:6px; height:6px; background:var(--text-muted); border-radius:50%; display:inline-block;"></span> OFFLINE`;
            
            if (globalBadge) globalBadge.innerHTML = badgeHtml;
            if (hubBadge) hubBadge.innerHTML = badgeHtml;
        }

        // --- TESTING SUITE REMOVED ---"""
if target4 in content and "handleAIStatusUpdate" not in content:
    content = content.replace(target4, replace4)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injection script completed.")
