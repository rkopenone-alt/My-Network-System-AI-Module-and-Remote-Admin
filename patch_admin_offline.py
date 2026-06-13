import os

app_js_path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\App.js"
with open(app_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """            if (data.type === 'DOWNLOAD_PDF' && data.base64) {"""

replacement = """            if (data.type === 'OFFLINE_QUEUED') {
              Alert.alert('Offline Mode', `Request queued. Total queued: ${data.length}`);
              return;
            }

            if (data.type === 'OFFLINE_SYNCED') {
              Alert.alert('Sync Complete', `Successfully synced ${data.count} tasks to the server.`);
              return;
            }

            if (data.type === 'DOWNLOAD_PDF' && data.base64) {"""

if "OFFLINE_QUEUED" not in content:
    content = content.replace(target, replacement)
    with open(app_js_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched admin-app App.js")
else:
    print("Already patched")
