import os

def fix(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = f.read()
    
    data = data.replace(r"\\\'PLAY_SOUND\\\'", "'PLAY_SOUND'")
    data = data.replace(r"\\\'siren_loop\\\'", "'siren_loop'")
    data = data.replace(r"\\\'STOP_SOUND\\\'", "'STOP_SOUND'")
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(data)

fix('rescuer-app/htmlStr.js')
fix('public-sos-app/htmlStr.js')
