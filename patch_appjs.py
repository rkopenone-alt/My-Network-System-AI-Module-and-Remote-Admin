import sys

def patch_appjs():
    file_path = r'c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\rescuer-app\App.js'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add getParsedUrls function
    if 'const getParsedUrls = (ip) => {' not in content:
        insert_idx = content.find('const GlobalState = {')
        parsed_fn = """
const getParsedUrls = (ip) => {
  let clean = ip ? ip.trim() : '';
  if (!clean) return { valid: false };
  let hasProtocol = clean.startsWith('http://') || clean.startsWith('https://');
  let hasPort = clean.split(':').length > (hasProtocol ? 2 : 1);
  let httpUrl = clean;
  if (!hasProtocol) {
    httpUrl = 'http://' + clean;
    if (!hasPort) httpUrl += ':3001';
  }
  let wsUrl = httpUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  return { valid: true, httpUrl, wsUrl };
};

"""
        content = content[:insert_idx] + parsed_fn + content[insert_idx:]

    # 2. Fix health check
    old_health_check = """    const ipRegex = /^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$/;
    const cleanIp = serverIp ? serverIp.trim() : '';
    if (!cleanIp || !ipRegex.test(cleanIp)) {
      setIsConnected(false);
      return;
    }
    const checkConnection = async () => {
      if (Date.now() - (GlobalState.lastSuccessTime || 0) < 10000) {
        setIsConnected(true);
        return;
      }
      try {
        const res = await fetchWithTimeout(`http://${cleanIp}:${SERVER_PORT}/api/health`, {}, 3000);"""
    
    new_health_check = """    const parsed = getParsedUrls(serverIp);
    if (!parsed.valid) {
      setIsConnected(false);
      return;
    }
    const checkConnection = async () => {
      if (Date.now() - (GlobalState.lastSuccessTime || 0) < 10000) {
        setIsConnected(true);
        return;
      }
      try {
        const res = await fetchWithTimeout(`${parsed.httpUrl}/api/health`, {}, 3000);"""

    if old_health_check in content:
        content = content.replace(old_health_check, new_health_check)
    else:
        print("Could not find health check logic")

    # 3. Add effect to inject updated URLs into WebView
    old_init = """    };
    initializeApp();
  }, []);"""

    new_init = """    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (webViewRef.current && serverIp) {
      const parsed = getParsedUrls(serverIp);
      const code = `
        window.__SERVER_IP__ = '${serverIp}';
        window.__API_BASE__ = '${parsed.httpUrl}/api';
        window.__WS_URL__ = '${parsed.wsUrl}';
        localStorage.setItem('manualServerIp', '${serverIp}');
        // window.location.reload();
        true;
      `;
      webViewRef.current.injectJavaScript(code);
    }
  }, [serverIp]);"""

    if old_init in content:
        content = content.replace(old_init, new_init)
    else:
        print("Could not find init logic")

    # 4. Update initial WebView injection
    old_inject = """  // Inject variables into the WebView
  // Keep this static so the WebView does not reload when state changes
  const injectedJavaScript = `
    window.__SERVER_PORT__ = '${SERVER_PORT}';
    window.__IS_NATIVE_APP__ = true;
    ${clearSession ? 'localStorage.clear();' : ''}
    true;
  `;"""

    new_inject = """  // Inject variables into the WebView
  // Keep this static so the WebView does not reload when state changes
  const parsedForInject = getParsedUrls(serverIp);
  const injectedJavaScript = `
    window.__SERVER_PORT__ = '${SERVER_PORT}';
    window.__SERVER_IP__ = '${serverIp}';
    window.__API_BASE__ = '${parsedForInject.httpUrl}/api';
    window.__WS_URL__ = '${parsedForInject.wsUrl}';
    if (!localStorage.getItem('manualServerIp')) {
       localStorage.setItem('manualServerIp', '${serverIp}');
    }
    window.__IS_NATIVE_APP__ = true;
    ${clearSession ? 'localStorage.clear();' : ''}
    true;
  `;"""

    if old_inject in content:
        content = content.replace(old_inject, new_inject)
    else:
        print("Could not find inject logic")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("App.js patched successfully.")

patch_appjs()
