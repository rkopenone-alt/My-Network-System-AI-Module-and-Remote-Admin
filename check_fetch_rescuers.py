import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('raw_admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

for match in re.finditer(r'fetch\([^\)]*rescuers[^\)]*\)', content, re.IGNORECASE):
    start = max(0, match.start() - 100)
    end = min(len(content), match.end() + 200)
    print("Fetch rescuers:", content[start:end])
