const fs = require('fs');
let c = fs.readFileSync('public/Web ADMIN.html', 'utf8');

c = c.replace(/if \(data\.type === 'RESCUE_REQUEST_ACCEPTED' \|\| data\.type === 'RESCUE_REQUEST_DECLINED'\) {[\s\S]*?closeModal\('sosAlertModal'\);\s*}/g, `if (['RESCUE_REQUEST_ACCEPTED', 'RESCUE_REQUEST_COMPLETED', 'RESCUE_REQUEST_IN_PROGRESS'].includes(data.type)) {
                                if (window.currentSosAudio) { window.currentSosAudio.pause(); window.currentSosAudio.currentTime = 0; }
                                closeModal('sosAlertModal');
                            }
                            if (data.type === 'RESCUE_REQUEST_UPDATE' && data.data && data.data.status && data.data.status !== 'pending') {
                                if (window.currentSosAudio) { window.currentSosAudio.pause(); window.currentSosAudio.currentTime = 0; }
                                closeModal('sosAlertModal');
                            }`);

fs.writeFileSync('public/Web ADMIN.html', c);
