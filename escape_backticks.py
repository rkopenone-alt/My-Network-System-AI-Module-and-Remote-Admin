import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    if text.startswith('export const htmlString = `'):
        # Extract the inner part
        end_idx = text.rfind('`;')
        if end_idx == -1: end_idx = len(text) - 1
        raw_html = text[len('export const htmlString = `'):end_idx]
        
        # Unescape anything that might already be escaped (to prevent double escaping)
        raw_html = raw_html.replace('\\`', '`').replace('\\${', '${')
        
        # Escape ` and ${
        raw_html = raw_html.replace('`', '\\`').replace('${', '\\${')
        
        safe_js = 'export const htmlString = `' + raw_html + '`;\n'
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(safe_js)
        print(f"Fixed backticks in {filepath}")

fix_file('admin-app/htmlStr.js')
