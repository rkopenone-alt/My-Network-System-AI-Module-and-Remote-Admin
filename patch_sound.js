const fs = require('fs');

function injectRescuer() {
    let t = fs.readFileSync('rescuer-app/htmlStr.js', 'utf8');
    
    // We already found that "Dispatch Alerts" exists in rescuer.
    const idx = t.indexOf('Dispatch Alerts</div>');
    if(idx > -1) {
        const endIdx = t.indexOf('</div>', idx + 50); // end of the item-val div
        if(endIdx > -1) {
            const part1 = t.substring(0, endIdx + 6);
            const part2 = t.substring(endIdx + 6);
            t = part1 + `
                        <div class="settings-item" id="soundToggleBtn" onclick="window.isMuted = !window.isMuted; this.querySelector('.item-val').innerText = window.isMuted ? 'MUTED' : 'ON'; if(window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({type: window.isMuted ? 'STOP_SOUND' : 'PLAY_SOUND', sound: 'config'})); }">
                            <div class="item-label"><i>🔊</i> Hardware Sound</div>
                            <div class="item-val">ON</div>
                        </div>` + part2;
            fs.writeFileSync('rescuer-app/htmlStr.js', t);
            console.log('rescuer-app updated successfully');
        } else {
            console.log('endIdx not found in rescuer');
        }
    } else {
        console.log('Dispatch Alerts not found in rescuer');
    }
}

function injectPublic() {
    let t = fs.readFileSync('public-sos-app/htmlStr.js', 'utf8');
    
    // public app might not have a settings page at all?
    // Let's see if it has 'Emergency Alerts' or just 'settings-group'
    // Earlier we saw "settings-group in public? false"
    // Does public app even have a settings page?
    const idx = t.indexOf('class="settings');
    console.log('public app has "class=\\"settings"?', idx > -1);
}

injectRescuer();
injectPublic();
