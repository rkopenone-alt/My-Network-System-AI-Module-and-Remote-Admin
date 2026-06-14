with open('public-sos-app/htmlStr.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '<div class="section-label" style="text-align:left; margin-top:5px; margin-bottom:10px; color:var(--primary);">Developer Tools (Testing)</div>'
replacement = '''<div class="section-label" style="text-align:left; margin-top:5px; margin-bottom:10px; color:var(--primary);">App Settings</div>
                    <div class="config-card" style="margin-bottom:20px; border: 2px solid var(--border);">
                        <div class="config-row" style="padding:15px 20px; display:flex; justify-content:space-between; align-items:center;" id="soundToggleBtn" onclick="window.isMuted = !window.isMuted; this.querySelector('.item-val').innerText = window.isMuted ? 'MUTED' : 'ON'; if(window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({type: window.isMuted ? 'STOP_SOUND' : 'PLAY_SOUND', sound: 'config'})); }">
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-size:14px; font-weight:800;">🔊 Hardware Sound</span>
                                <span style="font-size:10px; color:var(--text-muted);">Toggle app sounds</span>
                            </div>
                            <div class="item-val" style="font-weight:900; color:var(--primary);">ON</div>
                        </div>
                    </div>
                    ''' + target

if target in text:
    text = text.replace(target, replacement)
    with open('public-sos-app/htmlStr.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Injected to public-sos-app/htmlStr.js successfully')
else:
    # try with escaped quotes if it's minified string
    target2 = '<div class=\\"section-label\\" style=\\"text-align:left; margin-top:5px; margin-bottom:10px; color:var(--primary);\\">Developer Tools (Testing)</div>'
    if target2 in text:
        text = text.replace(target2, replacement.replace('"', '\\"'))
        with open('public-sos-app/htmlStr.js', 'w', encoding='utf-8') as f:
            f.write(text)
        print('Injected to public-sos-app/htmlStr.js successfully (escaped)')
    else:
        print('Target not found in public-sos-app/htmlStr.js')
