import os
import json

source_file = r'C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\system-backend\public\Web ADMIN.html'
dest_file = r'C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js'

with open(source_file, 'r', encoding='utf-8') as f:
    html_content = f.read()

# Make sure toggleGlobalAI is there
if 'function toggleGlobalAI' not in html_content:
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
    html_content = html_content.replace('</body>', js_code)

# Remove any existing \r\n and replace with \n
html_content = html_content.replace('\r\n', '\n')

# Convert HTML string safely to a JS template literal string OR a json string.
# A JSON string is safer against backticks inside the HTML.
js_content = 'export const htmlString = ' + json.dumps(html_content) + ';\n'

with open(dest_file, 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Generated clean htmlStr.js")
