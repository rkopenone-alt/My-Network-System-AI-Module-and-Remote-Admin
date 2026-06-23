import json
content = open('rescuer-app/htmlStr_formatted.js', encoding='utf-8').read()
encoded = json.dumps(content)
open('rescuer-app/htmlStr.js', 'w', encoding='utf-8').write(f'export const htmlString = {encoded};\n')
