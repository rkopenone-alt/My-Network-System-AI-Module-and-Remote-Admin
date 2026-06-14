with open('rescuer-app/htmlStr.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '<div class="item-label"><i>🔔</i> Dispatch Alerts</div>'

if target in text:
    replacement = '''<div class="item-label"><i>🔔</i> Dispatch Alerts</div>
                            <div class="item-val">ACTIVE</div>
                        </div>
                        <div class="settings-item" id="soundToggleBtn" onclick="window.isMuted = !window.isMuted; this.querySelector('.item-val').innerText = window.isMuted ? 'MUTED' : 'ON'; if(window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({type: window.isMuted ? 'STOP_SOUND' : 'PLAY_SOUND', sound: 'config'})); }">
                            <div class="item-label"><i>🔊</i> Hardware Sound</div>
                            <div class="item-val">ON</div>'''
    
    text = text.replace(target + '\r\n                            <div class="item-val">ACTIVE</div>', replacement)
    text = text.replace(target + '\n                            <div class="item-val">ACTIVE</div>', replacement)
    
    with open('rescuer-app/htmlStr.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Injected to rescuer-app/htmlStr.js')
else:
    print('Target not found in rescuer-app/htmlStr.js')


with open('public-sos-app/htmlStr.js', 'r', encoding='utf-8') as f:
    text_pub = f.read()

target_pub = '<div class="item-label"><i>🔔</i> Emergency Alerts</div>'

if target_pub in text_pub:
    replacement_pub = '''<div class="item-label"><i>🔔</i> Emergency Alerts</div>
                            <div class="item-val">ACTIVE</div>
                        </div>
                        <div class="settings-item" id="soundToggleBtn" onclick="window.isMuted = !window.isMuted; this.querySelector('.item-val').innerText = window.isMuted ? 'MUTED' : 'ON'; if(window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({type: window.isMuted ? 'STOP_SOUND' : 'PLAY_SOUND', sound: 'config'})); }">
                            <div class="item-label"><i>🔊</i> Hardware Sound</div>
                            <div class="item-val">ON</div>'''
    
    text_pub = text_pub.replace(target_pub + '\r\n                            <div class="item-val">ACTIVE</div>', replacement_pub)
    text_pub = text_pub.replace(target_pub + '\n                            <div class="item-val">ACTIVE</div>', replacement_pub)
    
    with open('public-sos-app/htmlStr.js', 'w', encoding='utf-8') as f:
        f.write(text_pub)
    print('Injected to public-sos-app/htmlStr.js')
else:
    print('Target not found in public-sos-app/htmlStr.js')
