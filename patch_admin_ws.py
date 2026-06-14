with open('admin-app/htmlStr.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = "const text = connected ? 'CONNECTED' : 'DISCONNECTED';"
replacement = "const text = connected ? 'CONNECTED' : 'DISCONNECTED';\n            if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WS_STATUS', connected: connected })); }"

if target in text:
    text = text.replace(target, replacement)
    with open('admin-app/htmlStr.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Patched admin-app successfully!")
else:
    print("Target not found")
