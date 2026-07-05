import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('raw_admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

for match in re.finditer(r'rescuers\s*=\s*await rescuersRes\.json', content, re.IGNORECASE):
    start = max(0, match.start() - 200)
    end = min(len(content), match.end() + 500)
    print("rescuers assign:", content[start:end])
