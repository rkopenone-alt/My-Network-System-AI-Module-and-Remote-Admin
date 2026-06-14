import io

# Read the file
with io.open('App_from_stash.js', 'r', encoding='utf-16') as f:
    content = f.read()

# Update getParsedUrls to include rawIp
content = content.replace(
  'return { valid: true, httpUrl, wsUrl };',
  'return { valid: true, httpUrl, wsUrl, rawIp: clean.replace(\'http://\',\'\').replace(\'https://\',\'\').split(\':\')[0] };'
)

# Replace the injectedJavaScript block in App_from_stash.js
old_inject = """  const injectedJavaScript = `
    window.__SERVER_PORT__ = '${SERVER_PORT}';
    window.__SERVER_IP__ = '${serverIp}';
    window.__API_BASE__ = 'http://${serverIp}:${SERVER_PORT}/api';
    window.__WS_URL__ = 'ws://${serverIp}:${SERVER_PORT}';
    if (!localStorage.getItem('manualServerIp')) {
       localStorage.setItem('manualServerIp', '${serverIp}');
    }
    window.__IS_NATIVE_APP__ = true;
    localStorage.setItem('app_installed_launch', 'true');
    true;
  `;"""

new_inject = """  const parsedUrls = getParsedUrls(serverIp);
  const injectedJavaScript = `
    window.__SERVER_PORT__ = '${SERVER_PORT}';
    window.__SERVER_IP__ = '${parsedUrls.rawIp}';
    window.__API_BASE__ = '${parsedUrls.httpUrl}/api';
    window.__WS_URL__ = '${parsedUrls.wsUrl}';
    if (!localStorage.getItem('manualServerIp')) {
       localStorage.setItem('manualServerIp', '${parsedUrls.rawIp}');
    }
    window.__IS_NATIVE_APP__ = true;
    localStorage.setItem('app_installed_launch', 'true');
    true;
  `;"""

content = content.replace(old_inject, new_inject)

with io.open('App.js', 'w', encoding='utf-8') as f:
    f.write(content)
