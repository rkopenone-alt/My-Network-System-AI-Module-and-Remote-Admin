import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

for match in re.finditer(r'ws\.on\(\'message\'', content, re.IGNORECASE):
    start = max(0, match.start() - 50)
    end = min(len(content), match.end() + 2000)
    print("ws message logic:", content[start:end])
    break
