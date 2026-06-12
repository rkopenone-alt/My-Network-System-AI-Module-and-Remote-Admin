const fs = require('fs');

let html = fs.readFileSync('system-backend/public/Web ADMIN.html', 'utf8');
const b64 = fs.readFileSync('sounds_b64.js', 'utf8');

// Inject the base64 audio and helper function at the end of body
const audioInjector = `
<!-- Audio injection -->
<script>
    ${b64}
    
    window.stopAdminSound = function() {
        if(window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'STOP_SOUND'}));
        } else {
            if(window._adminAudio) {
                window._adminAudio.pause();
                window._adminAudio.currentTime = 0;
            }
        }
    };

    window.playAdminSound = function(type) {
        window.stopAdminSound();
        if(window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'PLAY_SOUND', sound: type}));
        } else {
            let b64Str = CONFIG_SND;
            let duration = null;
            if(type === 'siren_loop') { b64Str = SIREN_LOOP; duration = 2000; }
            else if(type === 'siren') { b64Str = SIREN; duration = 2000; }
            else if(type === 'config') { b64Str = CONFIG_SND; }
            
            window._adminAudio = new Audio('data:audio/wav;base64,' + b64Str);
            if(type === 'siren_loop') window._adminAudio.loop = true;
            window._adminAudio.play().catch(e => console.log('Audio blocked:', e));

            if(duration) {
                setTimeout(() => window.stopAdminSound(), duration);
            }
        }
    };
</script>
`;

if (!html.includes('window.playAdminSound')) {
    html = html.replace('</body>', audioInjector + '\n</body>');
}

// Inside showAdminToast:
if (!html.includes('playAdminSound(')) {
    html = html.replace("function showAdminToast(msg, type = 'info') {", 
                        "function showAdminToast(msg, type = 'info') {\n            if (type === 'error' || type === 'warning') { window.playAdminSound('siren'); }\n            else if (msg && (msg.toLowerCase().includes('updat') || msg.toLowerCase().includes('save') || msg.toLowerCase().includes('set') || msg.toLowerCase().includes('chang'))) { window.playAdminSound('config'); }\n            else { window.playAdminSound('config'); }\n");
}

fs.writeFileSync('system-backend/public/Web ADMIN.html', html);
console.log('Web ADMIN.html patched');
