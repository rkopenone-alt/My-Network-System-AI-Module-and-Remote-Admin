import re

with open('rescuer-app/htmlStr.js', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'export const htmlString = "(.*)";', content, re.DOTALL)
if match:
    html_content = match.group(1).encode('utf-8').decode('unicode_escape')
    with open('rescuer-app_parsed.html', 'w', encoding='utf-8') as out:
        out.write(html_content)
    print("Parsed successfully to rescuer-app_parsed.html")
else:
    print("No match found")
