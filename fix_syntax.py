def remove_escapes(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace("\\'", "'")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

remove_escapes('preview-rescuer.html')
remove_escapes('preview-mobile-app.html')
print("Fixed syntax")
