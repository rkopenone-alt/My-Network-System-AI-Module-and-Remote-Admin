import os
import re

def fix_file(filepath):
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # The issue: the previous injection used actual " quotes inside the javascript string.
    # Specifically, they injected:
    # <div class="settings-item" id="soundToggleBtn" onclick="window.isMuted = !window.isMuted; this.querySelector('.item-val').innerText = window.isMuted ? 'MUTED' : 'ON'; if(window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({type: window.isMuted ? 'STOP_SOUND' : 'PLAY_SOUND', sound: 'config'})); }">
    #                             <div class="item-label"><i>...</i> Hardware Sound</div>
    #                             <div class="item-val">ON</div>
    #                         </div>
    
    # Let's find this section by its ID
    start_str = '<div class="settings-item" id="soundToggleBtn"'
    end_str = 'Hardware Sound</div>\n                            <div class="item-val">ON</div>\n                        </div>'
    
    # Or more generally:
    # We find all <div class="settings-item" id="soundToggleBtn" ... </div> and replace all " inside it with \"
    
    def replacer(match):
        content = match.group(0)
        # Escape the double quotes so the JS string doesn't break
        content = content.replace('"', '\\"')
        return content
        
    pattern = r'<div class="settings-item" id="soundToggleBtn".*?Hardware Sound</div>.*?</div>'
    new_text = re.sub(pattern, replacer, text, flags=re.DOTALL)
    
    # There's also the chance the previous script injected literal newlines instead of \r\n inside the js string
    # Let's see if we can find literal newlines that are breaking the string.
    # Since `export const htmlString = "<!DOCTYPE html>...` doesn't support multiline unless we use template literals.
    # Wait, the original code had:
    # export const htmlString = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n...
    # So any literal newlines will break it!
    # Let's replace any literal newlines between `<div class=\\"settings-item\\" id=\\"soundToggleBtn\\"` and `</div>`
    
    def replacer_newlines(match):
        content = match.group(0)
        content = content.replace('\n', '\\n').replace('\r', '\\r')
        return content
        
    pattern_nl = r'<div class=\\"settings-item\\" id=\\"soundToggleBtn\\".*?Hardware Sound</div>.*?</div>'
    new_text = re.sub(pattern_nl, replacer_newlines, new_text, flags=re.DOTALL)

    if text != new_text:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print(f"Fixed {filepath}")
    else:
        print(f"No changes for {filepath}")

fix_file('rescuer-app/htmlStr.js')
fix_file('admin-app/htmlStr.js')
fix_file('public-sos-app/htmlStr.js')

