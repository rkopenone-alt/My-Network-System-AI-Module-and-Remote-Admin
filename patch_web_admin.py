import re

file_path = r'C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\system-backend\public\Web ADMIN.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update the header AI button
header_original = """            <div style="display: flex; align-items: center; gap: 8px; margin-right: 16px; background: #f8fafc; padding: 4px 12px; border-radius: 8px; border: 1px solid var(--border);">
                <span style="font-size: 12px; font-weight: 800; color: var(--text-main);">AI ROUTING</span>
                <label style="position: relative; display: inline-block; width: 34px; height: 20px;">
                    <input type="checkbox" id="globalAiToggle" onchange="toggleGlobalAI(this.checked)" style="opacity: 0; width: 0; height: 0;">
                    <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px;" id="globalAiSlider"></span>
                </label>
                <style>
                    #globalAiToggle:checked + span { background-color: #22c55e; }
                    #globalAiSlider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                    #globalAiToggle:checked + #globalAiSlider:before { transform: translateX(14px); }
                </style>
            </div>"""

header_new = """            <button id="globalAiBtn" onclick="toggleGlobalAI(this.dataset.enabled !== 'true')" data-enabled="false" style="display: flex; align-items: center; justify-content: center; margin-right: 16px; padding: 6px 16px; border-radius: 8px; font-weight: 900; font-size: 14px; border: none; cursor: pointer; transition: 0.3s; background-color: #ef4444; color: white; min-width: 130px;">
                <i data-lucide="cpu" style="width:18px; margin-right:6px;"></i> AI OFFLINE
            </button>"""

if header_original in html:
    html = html.replace(header_original, header_new)
else:
    print("Warning: header_original not found")

# 2. Update the Operations Hub AI container
hub_original = """            <!-- AI Routing Toggle (Ops Hub) -->
            <div style="margin-top: 24px; padding: 16px; border-radius: 12px; border: 1px solid var(--border); background: #f8fafc;">"""

hub_new = """            <!-- AI Routing Toggle (Ops Hub) -->
            <div id="hubAiContainer" style="margin-top: 24px; padding: 16px; border-radius: 12px; border: 1px solid #ef4444; background: #fee2e2; transition: 0.3s;">"""

if hub_original in html:
    html = html.replace(hub_original, hub_new)
else:
    print("Warning: hub_original not found")

# 3. Update toggleGlobalAI function
script_original = """function toggleGlobalAI(enabled) {
    fetch('/api/ai/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enabled })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            document.querySelectorAll('#globalAiToggle, #hubAiToggle').forEach(el => el.checked = enabled);
            const badge = document.getElementById('hubAiStatusBadge');
            if(badge) badge.innerHTML = enabled ? '<span style="width:6px; height:6px; background:#22c55e; border-radius:50%; display:inline-block;"></span> ONLINE' : '<span style="width:6px; height:6px; background:var(--text-muted); border-radius:50%; display:inline-block;"></span> OFFLINE';
            if (typeof showAdminToast === "function") showAdminToast(enabled ? "AI Routing Enabled" : "AI Routing Disabled", enabled ? "success" : "info");
        }
    })
    .catch(e => console.error("Error toggling AI", e));
}"""

script_new = """function toggleGlobalAI(enabled) {
    fetch('/api/ai/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enabled })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            updateAiUI(enabled);
            if (typeof showAdminToast === "function") showAdminToast(enabled ? "AI Routing Enabled" : "AI Routing Disabled", enabled ? "success" : "info");
        }
    })
    .catch(e => console.error("Error toggling AI", e));
}

function updateAiUI(enabled) {
    const btn = document.getElementById('globalAiBtn');
    if(btn) {
        btn.dataset.enabled = enabled ? 'true' : 'false';
        btn.innerHTML = enabled ? '<i data-lucide="cpu" style="width:18px; margin-right:6px;"></i> AI ONLINE' : '<i data-lucide="cpu" style="width:18px; margin-right:6px;"></i> AI OFFLINE';
        btn.style.backgroundColor = enabled ? '#22c55e' : '#ef4444';
    }
    
    const hubContainer = document.getElementById('hubAiContainer');
    if(hubContainer) {
        hubContainer.style.backgroundColor = enabled ? '#dcfce7' : '#fee2e2';
        hubContainer.style.borderColor = enabled ? '#22c55e' : '#ef4444';
    }
    
    document.querySelectorAll('#hubAiToggle').forEach(el => el.checked = enabled);
    const badge = document.getElementById('hubAiStatusBadge');
    if(badge) {
        badge.innerHTML = enabled ? '<span style="width:6px; height:6px; background:#22c55e; border-radius:50%; display:inline-block;"></span> ONLINE' : '<span style="width:6px; height:6px; background:#ef4444; border-radius:50%; display:inline-block;"></span> OFFLINE';
        badge.style.color = enabled ? '#166534' : '#991b1b';
    }
    
    if (window.lucide) window.lucide.createIcons();
}

// Fetch status on load
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/ai/status')
        .then(res => res.json())
        .then(data => {
            if(data.enabled !== undefined) updateAiUI(data.enabled);
        })
        .catch(e => console.error(e));
});"""

if script_original in html:
    html = html.replace(script_original, script_new)
else:
    print("Warning: script_original not found")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(html)
print("Web ADMIN.html patched")
