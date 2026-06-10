import sys

js_code = """
<script>
function toggleGlobalAI(enabled) {
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
}
</script>
</body>
"""

with open('system-backend/public/Web ADMIN.html', 'r', encoding='utf-8') as f:
    content = f.read()

if 'function toggleGlobalAI' not in content:
    content = content.replace('</body>', js_code)
    with open('system-backend/public/Web ADMIN.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected into Web ADMIN.html")
else:
    print("Already in Web ADMIN.html")
