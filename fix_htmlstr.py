import re, json

with open(r'c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the first backtick and the last backtick
first_backtick = content.find('')
last_backtick = content.rfind('')

if first_backtick != -1 and last_backtick != -1 and first_backtick != last_backtick:
    prefix = content[:first_backtick]
    html_content = content[first_backtick+1:last_backtick]
    
    # We need to unescape any \ that was escaped in the file, because it's no longer inside a backtick string
    html_content = html_content.replace('\\\\', '')
    
    new_content = prefix + json.dumps(html_content) + ';'
    
    with open(r'c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print('Converted admin-app/htmlStr.js to use double quotes.')
else:
    print('Backticks not found or already converted.')
