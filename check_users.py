import re

with open('raw_admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

for match in re.finditer(r'function fetchUsers', content, re.IGNORECASE):
    start = max(0, match.start() - 50)
    end = min(len(content), match.end() + 1000)
    print("fetchUsers:", content[start:end])

# Also let's look for how rescuers are mapped
for match in re.finditer(r'users\.forEach', content, re.IGNORECASE):
    start = max(0, match.start() - 100)
    end = min(len(content), match.end() + 1000)
    print("users mapping:", content[start:end])
