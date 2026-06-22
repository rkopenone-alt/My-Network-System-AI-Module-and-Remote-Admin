import os

def fix(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = f.read()
    
    # We want to replace exactly "\\" + "'" with just "'"
    data = data.replace("\\\\'", "'")
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(data)

fix('rescuer-app/htmlStr.js')
fix('public-sos-app/htmlStr.js')
