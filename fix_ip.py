import os

def fix_ip_regex(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace "const cleanIp = serverIp ? serverIp.trim() : '';" with a version that strips http
    content = content.replace("const cleanIp = serverIp ? serverIp.trim() : '';", "let cleanIp = serverIp ? serverIp.trim() : '';\n    if (cleanIp.startsWith('http://')) cleanIp = cleanIp.replace('http://', '');\n    if (cleanIp.startsWith('https://')) cleanIp = cleanIp.replace('https://', '');")

    # For public-sos-app, the variable is "const cleanIp = ipInput.trim();"
    content = content.replace("const cleanIp = ipInput.trim();", "let cleanIp = ipInput.trim();\n                  if (cleanIp.startsWith('http://')) cleanIp = cleanIp.replace('http://', '');\n                  if (cleanIp.startsWith('https://')) cleanIp = cleanIp.replace('https://', '');")
    
    # Another one in public-sos-app: "const cleanIp = serverIp ? serverIp.trim() : '';"
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_ip_regex(r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\rescuer-app\App.js")
fix_ip_regex(r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\public-sos-app\App.js")
print("IP regex logic updated")
