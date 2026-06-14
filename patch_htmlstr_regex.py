import re

file_path = r'c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\rescuer-app\htmlStr.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Patch init()
content = re.sub(
    r"this\.serverIp\s*=\s*finalIp;\s*this\.API\s*=\s*finalIp\s*\?\s*`http://\$\{finalIp\}:3001/api`\s*:\s*'';\s*this\.WS_URL\s*=\s*finalIp\s*\?\s*`ws://\$\{finalIp\}:3001`\s*:\s*'';",
    """this.serverIp = finalIp;
                let cleanIp = finalIp.trim();
                let hasProto = cleanIp.startsWith('http://') || cleanIp.startsWith('https://');
                let hasPort = cleanIp.split(':').length > (hasProto ? 2 : 1);
                let httpBase = cleanIp;
                if (!hasProto) {
                    httpBase = 'http://' + cleanIp;
                    if (!hasPort && cleanIp !== '') httpBase += ':3001';
                }
                this.HTTP_BASE = httpBase;
                this.API = finalIp ? `${httpBase}/api` : '';
                this.WS_URL = finalIp ? httpBase.replace('http://', 'ws://').replace('https://', 'wss://') : '';""",
    content
)

# 2. Patch updateLogos()
content = re.sub(
    r"const ip = this\.serverIp \|\| window\.location\.hostname \|\| '127\.0\.0\.1';\s*const logoImg = document\.getElementById\('loginLogoImg'\);\s*if \(logoImg\) \{\s*logoImg\.src = `http://\$\{ip\}:3001/official_rescuer_icon\.png`;\s*\}",
    """const logoImg = document.getElementById('loginLogoImg');
                if (logoImg) {
                    logoImg.src = this.HTTP_BASE ? `${this.HTTP_BASE}/official_rescuer_icon.png` : 'official_rescuer_icon.png';
                }""",
    content
)

# 3. Patch modal image
content = re.sub(
    r"<img src=\\?\"http://\$\{core\.serverIp \|\| window\.location\.hostname \|\| '127\.0\.0\.1'\}:3001\$\{c\.image_url\}\\?\"",
    r'<img src="${core.HTTP_BASE || \'http://127.0.0.1:3001\'}${c.image_url}"',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex patching complete.")
