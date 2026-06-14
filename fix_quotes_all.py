import os
import json
import re

def fix_html_str(file_path):
    print(f"Fixing {file_path}...")
    if not os.path.exists(file_path):
        print("File not found")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if it starts with 'export const htmlString = "'
    start_str = 'export const htmlString = "'
    if content.startswith(start_str):
        # Already string literal
        try:
            # We need to parse the literal back to evaluate what's unescaped
            end_idx = content.rfind('";\n')
            if end_idx == -1:
                end_idx = len(content) - 2 # guess
            
            raw_content = content[len(start_str):end_idx]
            # Since the literal contains unescaped quotes which break JSON parsing, 
            # we can't just json.loads. 
            # It's better to read the raw HTML from the previous unescaped file if we can,
            # or we can write a regex to escape quotes that aren't already escaped.
            # But earlier, I just used the backup file or the original unescaped file.
        except Exception as e:
            print(f"Error: {e}")
            pass

    # A simpler way: we know the error is from unescaped double quotes in the JS code
    # inside the html payload. 
    # But wait, earlier I fixed rescuer-app/htmlStr.js by regenerating it or escaping it.
    # What I'll do is: find 'id="soundToggleBtn"' in admin-app/htmlStr.js and just escape the double quotes inside the onclick handler manually!
    
fix_html_str('admin-app/htmlStr.js')
fix_html_str('public-sos-app/htmlStr.js')
