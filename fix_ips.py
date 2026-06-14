import re

filepath = r'C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\system-backend\public\Web ADMIN.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix SERVER_IP definition
old_server_ip = "const SERVER_IP = manualIp ? manualIp : ((window.location.protocol === 'http:' || window.location.protocol === 'https:') ? window.location.hostname : '127.0.0.1');"
new_server_ip = "const SERVER_IP = window.__SERVER_IP__ || (manualIp ? manualIp : ((window.location.protocol === 'http:' || window.location.protocol === 'https:') ? window.location.hostname : '127.0.0.1'));"
if old_server_ip in content:
    content = content.replace(old_server_ip, new_server_ip)

# Ensure fetch URLs are properly formatted
content = re.sub(r"fetch\('`/api/", r"fetch(`${API_BASE}/", content) # clean up powershell mess if any
content = re.sub(r"fetch\('/api/", r"fetch(`${API_BASE}/", content)
content = re.sub(r"fetch\(`\$\{API_BASE\}/api/", r"fetch(`${API_BASE}/", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed system-backend/public/Web ADMIN.html")
