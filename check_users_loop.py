import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

for match in re.finditer(r'for \(let user of users\) \{', content, re.IGNORECASE):
    start = max(0, match.start() - 200)
    end = min(len(content), match.end() + 200)
    print("Loop:", content[start:end])
