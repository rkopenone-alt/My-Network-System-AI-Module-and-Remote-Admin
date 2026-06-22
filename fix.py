import os
import re

def fix_file(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        data = f.read()

    # The emojis got corrupted into garbage, but only the ones with quotes break the syntax.
    # We'll replace the entire second argument of toast calls with '*'
    
    # Match this.toast('...', '...') or this.toast("...", "...")
    data = re.compile(r'(\.toast\(\s*[\'\"].*?[\'\"]\s*,\s*)[\'\"].*?[\'\"](\s*(?:,\s*\d+)?\))').sub(r'\1"*"\2', data)
    data = re.compile(r'(toast\(msg,\s*icon\s*=\s*)[\'\"].*?[\'\"]').sub(r'\1"*"', data)

    # Specific hardcoded ones that might be broken:
    data = data.replace('"dY""', '"*"')
    data = data.replace('"dY""', '"*"')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(data)

fix_file('preview-rescuer.html')
fix_file('preview-mobile-app.html')
print("Done")
