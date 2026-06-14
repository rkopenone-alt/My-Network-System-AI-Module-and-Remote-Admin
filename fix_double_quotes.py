import os
import json

def fix_raw_newlines(file_path):
    if not os.path.exists(file_path): return
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    if text.startswith('export const htmlString = "'):
        # It's double quoted.
        # Let's extract everything inside the double quotes
        start_idx = len('export const htmlString = "')
        end_idx = text.rfind('";')
        if end_idx == -1: end_idx = text.rfind('"')
        
        inner = text[start_idx:end_idx]
        
        # Replace all literal newlines with escaped newlines
        inner = inner.replace('\r', '\\r').replace('\n', '\\n')
        
        # But wait! If we already escaped some newlines as '\\r\\n', doing replace('\\r', '\\\\r') will double escape them!
        # So first we unescape them back to literal newlines, then escape everything!
        inner = inner.replace('\\r', '\r').replace('\\n', '\n')
        
        # Now escape ALL of them
        inner = inner.replace('\r', '\\r').replace('\n', '\\n')
        
        # Also, unescape and re-escape double quotes to ensure they are valid
        inner = inner.replace('\\"', '"') # unescape first
        inner = inner.replace('"', '\\"') # escape all double quotes
        
        safe_js = 'export const htmlString = "' + inner + '";\n'
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(safe_js)
        print("Fixed", file_path)

fix_raw_newlines('rescuer-app/htmlStr.js')
fix_raw_newlines('public-sos-app/htmlStr.js')
