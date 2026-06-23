import json
content = open('rescuer-app/htmlStr.js', encoding='utf-8').read()
prefix = 'export const htmlString = '
if content.startswith(prefix):
    s = content[len(prefix):].strip()
    if s.endswith(';'): s = s[:-1]
    if s.startswith('"'): s = json.loads(s)
    open('rescuer-app/htmlStr_formatted.js', 'w', encoding='utf-8').write(s)
