import os
import json
import base64
import sys

workspace_dir = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026"

preview_rescuer = os.path.join(workspace_dir, "preview-rescuer.html")
rescuer_html_str = os.path.join(workspace_dir, "rescuer-app", "htmlStr.js")
icon_path = os.path.join(workspace_dir, "rescuer-app", "assets", "icon.png")

print(f"[*] Reading preview-rescuer.html")
with open(preview_rescuer, 'r', encoding='utf-8') as f:
    html_content = f.read()

if os.path.exists(icon_path):
    print(f"[*] Base64 encoding icon.png")
    with open(icon_path, 'rb') as img_file:
        base64_data = base64.b64encode(img_file.read()).decode('utf-8')
        base64_img = f"data:image/png;base64,{base64_data}"
        html_content = html_content.replace('src="official_rescuer_icon.png"', f'src="{base64_img}"')
else:
    print("[!] icon.png not found!")

print(f"[*] Compiling rescuer HTML string into htmlStr.js...")
js_content = f"export const htmlString = {json.dumps(html_content)};\n"
with open(rescuer_html_str, 'w', encoding='utf-8') as f:
    f.write(js_content)
    
print("[+] Synchronizer Completed Successfully!")
