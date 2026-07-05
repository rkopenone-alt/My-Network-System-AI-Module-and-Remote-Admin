import re

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find WebSocket connection logic
for match in re.finditer(r'ws\.on\(\'close\'', content, re.IGNORECASE):
    start = max(0, match.start() - 100)
    end = min(len(content), match.end() + 1000)
    print("WebSocket close logic:", content[start:end])
