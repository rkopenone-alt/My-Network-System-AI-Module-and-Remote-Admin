import json
import sys

with open('admin-app/htmlStr.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the weird "xport... string
if content.startswith('"xport') or content.startswith('"export'):
    print("Fixing double-quoted string wrapper...")
    content = content[1:]
    if content.endswith('"') or content.endswith('";') or content.endswith('";\n'):
        content = content.rsplit('"', 1)[0]
    # It might still have `xport const ...`
    if content.startswith('xport '):
        content = 'e' + content

# Extract the HTML content
html = ""
if 'export const htmlString =' in content:
    payload_str = content[content.find('export const htmlString =') + len('export const htmlString ='):].strip()
    if payload_str.endswith(';'):
        payload_str = payload_str[:-1]
    
    # Is it a json string or a template literal?
    if payload_str.startswith('`'):
        html = payload_str[1:-1]
    elif payload_str.startswith('"'):
        try:
            html = json.loads(payload_str)
        except:
            print("Failed to decode JSON string")
            sys.exit(1)
else:
    print("Format not recognized")
    sys.exit(1)

# Inject toggleGlobalAI if missing
if 'function toggleGlobalAI' not in html:
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
    html = html.replace('</body>', js_code)
    print("Injected toggleGlobalAI")
else:
    print("toggleGlobalAI already present")

# Write it back as a valid string literal
with open('admin-app/htmlStr.js', 'w', encoding='utf-8') as f:
    f.write(f'export const htmlString = {json.dumps(html)};\\n')

print("Done processing admin-app/htmlStr.js")
