import re

with open('raw_admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

for match in re.finditer(r'RESCUER_STATUS_CHANGE', content, re.IGNORECASE):
    start = max(0, match.start() - 100)
    end = min(len(content), match.end() + 1500)
    print("Admin ws logic:", content[start:end])
