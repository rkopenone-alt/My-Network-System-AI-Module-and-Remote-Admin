import json

with open('admin-app/htmlStr.js', 'r', encoding='utf-8') as f:
    s = f.read()

# find the JSON string portion
start_idx = s.find('"')
end_idx = s.rfind('"')

if start_idx != -1 and end_idx != -1 and start_idx != end_idx:
    json_str = s[start_idx:end_idx+1]
    html = json.loads(json_str)
    
    # Remove any stray backticks or semicolons from the end
    html = html.replace('`;', '').replace('`', '')
    
    with open('admin-app/htmlStr.js', 'w', encoding='utf-8') as f:
        f.write('export const htmlString = ' + json.dumps(html) + ';\n')
    print("Cleaned up htmlStr.js")
else:
    print("Could not find string")
