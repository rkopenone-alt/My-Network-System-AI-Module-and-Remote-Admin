import os
import json

def fix_htmlStr(file_path):
    print(f"Fixing {file_path}")
    if not os.path.exists(file_path):
        print("Not found")
        return
        
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Determine if it uses backticks or double quotes
    if text.startswith('export const htmlString = `'):
        print("Uses backticks. Extracting raw HTML...")
        # Find the end
        end_idx = text.rfind('`;')
        if end_idx == -1:
            end_idx = text.rfind('`')
            
        raw_html = text[len('export const htmlString = `'):end_idx]
        
        # Now we have the raw HTML.
        # But wait, did they escape backticks like \` or \${ ?
        # If they did, we should unescape them before wrapping in double quotes.
        # But since the build failed, they DID NOT escape them!
        # So raw_html is just the exact literal HTML!
        
        # Let's just wrap it in double quotes safely
        safe_js = "export const htmlString = " + json.dumps(raw_html) + ";\n"
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(safe_js)
        print("Fixed backticks successfully.")
        
    elif text.startswith('export const htmlString = "'):
        print("Uses double quotes. Let's make sure it's valid JSON.")
        # Try to parse it to see if it's valid
        start_idx = len('export const htmlString = ')
        end_idx = text.rfind(';')
        if end_idx == -1:
            end_idx = len(text)
        string_part = text[start_idx:end_idx].strip()
        try:
            json.loads(string_part)
            print("Already valid double quote string.")
        except Exception as e:
            print(f"Invalid double quote string: {e}")
            # If it's invalid, it might be because of unescaped double quotes inside!
            # Let's fix the unescaped double quotes manually.
            # Our previous soundToggleBtn fix handled this. 
            pass

fix_htmlStr('admin-app/htmlStr.js')
fix_htmlStr('public-sos-app/htmlStr.js')
fix_htmlStr('rescuer-app/htmlStr.js')
