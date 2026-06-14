import re

with open('rescuer-app/htmlStr.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find URLs starting with http://
urls = re.findall(r'http://[^\\]+', content)
print("Found URLs:", urls[:10])
