import re

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

for match in re.finditer(r'app\.get\(\'/api/map', content, re.IGNORECASE):
    start = max(0, match.start() - 100)
    end = min(len(content), match.end() + 1000)
    print("Map API:", content[start:end])
