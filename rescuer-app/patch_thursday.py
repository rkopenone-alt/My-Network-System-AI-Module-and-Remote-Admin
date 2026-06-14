import io
import re

# Fix App.js
with io.open('App.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# 1. Remove getParsedUrls
app_js = re.sub(r'const getParsedUrls = \(ip\) => \{.*?};\n\n', '', app_js, flags=re.DOTALL)

# 2. Revert injectedJavaScript to only have SERVER_PORT and IS_NATIVE_APP
old_inject = '''  const parsedUrls = getParsedUrls(serverIp);
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
  `;'''

new_inject = '''  const injectedJavaScript = `
    window.__SERVER_PORT__ = '${SERVER_PORT}';
    window.__IS_NATIVE_APP__ = true;
    localStorage.setItem('app_installed_launch', 'true');
    true;
  `;'''
app_js = app_js.replace(old_inject, new_inject)

# 3. Remove the injection useEffect
app_js = re.sub(r'  useEffect\(\(\) => \{\n    if \(webViewRef\.current && serverIp\) \{\n      const parsedUrls.*?webViewRef\.current\.injectJavaScript\(code\);\n    \}\n  \}, \[serverIp\]\);\n\n', '', app_js, flags=re.DOTALL)

# 4. Fix health check
app_js = re.sub(r'  // Periodic health check\n  useEffect\(\(\) => \{\n    const ipRegex.*?\}, \[serverIp\]\);', '''  // Periodic health check
  useEffect(() => {
    const checkConnection = async () => {
      if (Date.now() - (GlobalState.lastSuccessTime || 0) < 10000) {
        setIsConnected(true);
        return;
      }
      try {
        const res = await fetchWithTimeout(`http://${serverIp}:${SERVER_PORT}/api/health`, {}, 3000);
        if (res.ok) {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (e) {
        setIsConnected(false);
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [serverIp]);''', app_js, flags=re.DOTALL)

# 5. Fix baseUrl
app_js = re.sub(r'const cleanBaseIp =.*?\n\n', '', app_js, flags=re.DOTALL)
app_js = app_js.replace('baseUrl: getParsedUrls(cleanBaseIp).httpUrl', 'baseUrl: `http://127.0.0.1:${SERVER_PORT}`')

# 6. Make sure UPDATE_IP is in onMessage
if 'UPDATE_IP' not in app_js:
    app_js = app_js.replace("if (data.type === 'LOGOUT')", """if (data.type === 'UPDATE_IP') {
              await AsyncStorage.setItem('serverIp', data.ip);
              setServerIp(data.ip);
              return;
            }
            if (data.type === 'LOGOUT')""")

with io.open('App.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

# Fix htmlStr.js
with io.open('htmlStr.js', 'r', encoding='utf-8') as f:
    html_str = f.read()

# 1. Fix core API initialization to not use __API_BASE__
html_str = html_str.replace('API: window.__API_BASE__ || `http://${window.location.hostname || \'\'}:3001/api`,', 'API: `http://${window.location.hostname || \'\'}:3001/api`,')
html_str = html_str.replace('WS_URL: window.__WS_URL__ || `ws://${window.location.hostname || \'\'}:3001`,', 'WS_URL: `ws://${window.location.hostname || \'\'}:3001`,')

# 2. Add UPDATE_IP native bridge message
update_ip_code = '''                if (isNative && window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'UPDATE_IP', ip: ip }));
                }'''
if 'UPDATE_IP' not in html_str:
    html_str = html_str.replace("localStorage.setItem('serverIp', ip);", f"{update_ip_code}\n                localStorage.setItem('serverIp', ip);")

with io.open('htmlStr.js', 'w', encoding='utf-8') as f:
    f.write(html_str)
