import re

with open('rescuer-app/htmlStr.js', 'r', encoding='utf-8') as f: text = f.read()

pattern = r'(<div class=\"item-label\">\s*<i>.*?</i>\s*Dispatch Alerts\s*</div>\s*<div class=\"item-val\">.*?</div>\s*</div>)'

replacement = r'''\1
                        <div class="settings-item" id="soundToggleBtn" onclick="window.isMuted = !window.isMuted; this.querySelector('.item-val').innerText = window.isMuted ? 'MUTED' : 'ON'; if(window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({type: window.isMuted ? 'STOP_SOUND' : 'PLAY_SOUND', sound: 'config'})); }">
                            <div class="item-label"><i>🔊</i> Hardware Sound</div>
                            <div class="item-val">ON</div>
                        </div>'''

new_text = re.sub(pattern, replacement, text)

if new_text != text:
    with open('rescuer-app/htmlStr.js', 'w', encoding='utf-8') as f: f.write(new_text)
    print('Injected to rescuer-app/htmlStr.js')
else:
    print('Target not found in rescuer-app/htmlStr.js')


with open('public-sos-app/htmlStr.js', 'r', encoding='utf-8') as f: text_pub = f.read()

# Let's see what the setting is called in public-sos-app. It might be 'Notifications'
pattern_pub = r'(<div class=\"settings-item\">\s*<div class=\"item-label\">\s*<i>.*?</i>\s*[A-Za-z ]+\s*</div>\s*<div class=\"item-val\">[A-Za-z]+</div>\s*</div>)'
# We will just inject it after the FIRST settings item in the first settings-group if we can't find Emergency Alerts specifically,
# but better to replace the specific Dispatch Alerts equivalent.
# Wait, let's just find "settings-group" and inject it there.

pattern_pub = r'(<div class=\"settings-group\">)'
replacement_pub = r'''\1
                        <div class="settings-item" id="soundToggleBtn" onclick="window.isMuted = !window.isMuted; this.querySelector('.item-val').innerText = window.isMuted ? 'MUTED' : 'ON'; if(window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({type: window.isMuted ? 'STOP_SOUND' : 'PLAY_SOUND', sound: 'config'})); }">
                            <div class="item-label"><i>🔊</i> Hardware Sound</div>
                            <div class="item-val">ON</div>
                        </div>'''

new_text_pub = re.sub(pattern_pub, replacement_pub, text_pub, count=1) # only insert in the first settings group

if new_text_pub != text_pub:
    with open('public-sos-app/htmlStr.js', 'w', encoding='utf-8') as f: f.write(new_text_pub)
    print('Injected to public-sos-app/htmlStr.js')
else:
    print('Target not found in public-sos-app/htmlStr.js')
