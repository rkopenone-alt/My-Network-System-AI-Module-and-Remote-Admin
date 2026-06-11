const fs = require('fs');
let data = fs.readFileSync('admin-app/htmlStr.js', 'utf8');

const newAI = `if (data.type === 'AI_ASSIGNED') {
        if (window.currentSosAudio) { window.currentSosAudio.pause(); window.currentSosAudio.currentTime = 0; }
        if (typeof closeModal === 'function') closeModal('sosAlertModal');
                            Swal.fire({
                                icon: 'info',
                                title: '🤖 AI Task Reassignment',
                                text: data.message,
                                timer: 5000,
                                timerProgressBar: true
                            });
                            refreshAllModules(); // Refresh tasks
                            return;
                        }`;

const aiRegex = /if \(data\.type === 'AI_ASSIGNED'\) \{\s*if \(window\.currentSosAudio\) \{ window\.currentSosAudio\.pause\(\); window\.currentSosAudio\.currentTime = 0; \}\s*if \(typeof closeModal === 'function'\) closeModal\('sosAlertModal'\);\s*showAdminToast\(`🤖 AI System: \$\{data\.message\}`,\s*'success'\);\s*refreshAllModules\(\); \/\/ Refresh tasks\s*return;\s*\}/s;
if (aiRegex.test(data)) {
    data = data.replace(aiRegex, newAI);
    console.log("Patched AI_ASSIGNED in admin-app via regex");
} else {
    // maybe there's a difference in the code
    const altRegex = /if \(data\.type === 'AI_ASSIGNED'\) \{.*?return;\s*\}/s;
    const match = data.match(altRegex);
    if (match) {
        data = data.replace(match[0], newAI);
        console.log("Patched AI_ASSIGNED using alternative broad regex");
    } else {
        console.log("Still could not find AI_ASSIGNED");
    }
}

fs.writeFileSync('admin-app/htmlStr.js', data);
