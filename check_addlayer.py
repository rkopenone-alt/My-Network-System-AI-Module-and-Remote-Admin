import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('raw_admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

for match in re.finditer(r'window\.markerClusterGroup\.addLayer', content, re.IGNORECASE):
    start = max(0, match.start() - 1500)
    end = min(len(content), match.end() + 200)
    print("addLayer:", content[start:end])
    break
