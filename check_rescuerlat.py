import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('raw_admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

for match in re.finditer(r'rescuerLat', content, re.IGNORECASE):
    start = max(0, match.start() - 1500)
    end = min(len(content), match.end() + 200)
    print("rescuerLat context:", content[start:end])
    break
