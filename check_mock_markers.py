import re

with open('raw_admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

print("Checking for ID 1 hardcode or mock data...")
# Look for anything like id: 1, lat:, lng:
matches = re.finditer(r'\{[^}]*lat:\s*[^,]+,\s*lng:\s*[^,]+[^}]*\}', content)
count = 0
for m in matches:
    if count > 20: break
    print(m.group(0)[:200])
    count += 1
