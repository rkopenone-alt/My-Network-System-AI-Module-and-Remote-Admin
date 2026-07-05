import re

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find WebSocket connection logic
for match in re.finditer(r'socket.*on.*connection', content, re.IGNORECASE):
    start = max(0, match.start() - 100)
    end = min(len(content), match.end() + 500)
    print("WebSocket logic:", content[start:end])
