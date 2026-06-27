file_path = r'C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\raw_admin.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    ("await fetch(`\\${API_BASE}/operations`);", "await fetch(`\\${API_BASE}/operations?_t=${Date.now()}`);"),
    ("await fetch(`\\${API_BASE}/rescue-requests`);", "await fetch(`\\${API_BASE}/rescue-requests?_t=${Date.now()}`);"),
    ("await fetch(`\\${API_BASE}/dashboard-stats`);", "await fetch(`\\${API_BASE}/dashboard-stats?_t=${Date.now()}`);"),
    ("await fetch(`\\${API_BASE}/commands`);", "await fetch(`\\${API_BASE}/commands?_t=${Date.now()}`);"),
    ("await fetch(`\\${API_BASE}/settings`);", "await fetch(`\\${API_BASE}/settings?_t=${Date.now()}`);"),
    ("await fetch(`\\${API_BASE}/ai/interval`);", "await fetch(`\\${API_BASE}/ai/interval?_t=${Date.now()}`);"),
    ("await fetch(`\\${API_BASE}/groups`);", "await fetch(`\\${API_BASE}/groups?_t=${Date.now()}`);"),
    ("await fetch(`\\${API_BASE}/users`);", "await fetch(`\\${API_BASE}/users?_t=${Date.now()}`);"),
    ("await fetch(`\\${API_BASE}/server-ip`);", "await fetch(`\\${API_BASE}/server-ip?_t=${Date.now()}`);"),
    ("await fetch(`http://\\${window.location.hostname || 'localhost'}:3001/api/server-ip`);", "await fetch(`http://\\${window.location.hostname || 'localhost'}:3001/api/server-ip?_t=${Date.now()}`);"),
]

for old, new in replacements:
    content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched raw_admin.html with cache-busters (using string replace).")
