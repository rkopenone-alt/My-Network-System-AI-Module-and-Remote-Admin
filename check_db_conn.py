import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

for match in re.finditer(r'sqlite3\.Database', content, re.IGNORECASE):
    start = max(0, match.start() - 100)
    end = min(len(content), match.end() + 100)
    print("DB connection:", content[start:end])
