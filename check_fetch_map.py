import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('raw_admin.html', 'r', encoding='utf-8') as f:
    content = f.read()
import re
for match in re.finditer(r'function fetchMapLocations', content, re.IGNORECASE):
    start = max(0, match.start() - 50)
    end = min(len(content), match.end() + 2000)
    print("fetchMapLocations:", content[start:end])
