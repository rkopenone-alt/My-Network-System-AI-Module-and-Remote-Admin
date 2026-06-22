def fix_sounds(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("\\'PLAY_SOUND\\'", "'PLAY_SOUND'")
    content = content.replace("\\'siren_loop\\'", "'siren_loop'")
    content = content.replace("\\'STOP_SOUND\\'", "'STOP_SOUND'")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_sounds('preview-rescuer.html')
fix_sounds('preview-mobile-app.html')
print("Fixed sound syntax")
