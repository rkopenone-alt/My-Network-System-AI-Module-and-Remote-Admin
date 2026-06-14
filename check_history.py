import re

with open('C:/Users/Alienware/Desktop/Rescue Backup AI 09-06-2026/rescuer-app/htmlStr.js', 'r', encoding='utf-8') as f:
    text = f.read()

matches = re.findall(r'id=\\?[\"\']([a-zA-Z0-9_-]*hist[a-zA-Z0-9_-]*)\\?[\"\']', text, re.IGNORECASE)
print('IDs with hist in rescuer-app:', set(matches))

with open('C:/Users/Alienware/Desktop/Rescue Backup AI 09-06-2026/admin-app/htmlStr.js', 'r', encoding='utf-8') as f:
    text = f.read()

matches = re.findall(r'id=\\?[\"\']([a-zA-Z0-9_-]*hist[a-zA-Z0-9_-]*)\\?[\"\']', text, re.IGNORECASE)
print('IDs with hist in admin-app:', set(matches))
