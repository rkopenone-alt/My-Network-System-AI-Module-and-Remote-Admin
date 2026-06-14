import re

with open('public-sos-app/htmlStr.js', 'r', encoding='utf-8') as f:
    text = f.read()

ids = re.findall(r'id=\"([^\"]+)\"', text)
filtered_ids = [i for i in ids if 'page' in i.lower() or 'tab' in i.lower() or 'setting' in i.lower() or 'menu' in i.lower()]
print("Found IDs in public app:", filtered_ids)
