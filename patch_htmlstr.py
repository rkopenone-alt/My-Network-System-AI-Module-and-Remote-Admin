import sys

def patch_htmlstr():
    file_path = r'c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\rescuer-app\htmlStr.js'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add HTTP_BASE logic to init()
    old_init = """            init() {
                // Resolve correct IP address
                const isNative = window.__IS_NATIVE_APP__ || (typeof window.ReactNativeWebView !== 'undefined');
                const storedIp = localStorage.getItem('serverIp');
                const finalIp = storedIp || window.__SERVER_IP__ || (isNative ? '' : window.location.hostname) || '';
                this.serverIp = finalIp;
                this.API = finalIp ? `http://${finalIp}:3001/api` : '';
                this.WS_URL = finalIp ? `ws://${finalIp}:3001` : '';"""

    new_init = """            init() {
                // Resolve correct IP address
                const isNative = window.__IS_NATIVE_APP__ || (typeof window.ReactNativeWebView !== 'undefined');
                const storedIp = localStorage.getItem('serverIp');
                const finalIp = storedIp || window.__SERVER_IP__ || (isNative ? '' : window.location.hostname) || '';
                this.serverIp = finalIp;
                
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
                this.WS_URL = finalIp ? httpBase.replace('http://', 'ws://').replace('https://', 'wss://') : '';"""

    if old_init in content:
        content = content.replace(old_init, new_init)
    else:
        print("Could not find old_init")
        return

    # 2. Fix updateLogos()
    old_logo = """            updateLogos() {
                const ip = this.serverIp || window.location.hostname || '127.0.0.1';
                const logoImg = document.getElementById('loginLogoImg');
                if (logoImg) {
                    logoImg.src = `http://${ip}:3001/official_rescuer_icon.png`;
                }
            },"""

    new_logo = """            updateLogos() {
                const logoImg = document.getElementById('loginLogoImg');
                if (logoImg) {
                    logoImg.src = this.HTTP_BASE ? `${this.HTTP_BASE}/official_rescuer_icon.png` : 'official_rescuer_icon.png';
                }
            },"""

    if old_logo in content:
        content = content.replace(old_logo, new_logo)
    else:
        print("Could not find old_logo")

    # 3. Fix modal image
    old_img = """<img src=\"http://${core.serverIp || window.location.hostname || '127.0.0.1'}:3001${c.image_url}\" style=\"width:100%; height:100%; object-fit:cover;\">"""
    new_img = """<img src=\"${core.HTTP_BASE || 'http://127.0.0.1:3001'}${c.image_url}\" style=\"width:100%; height:100%; object-fit:cover;\">"""

    if old_img in content:
        content = content.replace(old_img, new_img)
    else:
        print("Could not find old_img")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("htmlStr.js patched successfully.")

patch_htmlstr()
