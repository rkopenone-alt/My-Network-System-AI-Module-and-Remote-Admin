import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('raw_admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

for match in re.finditer(r'function renderMembers', content, re.IGNORECASE):
    start = max(0, match.start() - 50)
    end = min(len(content), match.end() + 2000)
    print("renderMembers:", content[start:end])
    break
