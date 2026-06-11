const fs = require('fs');
let data = fs.readFileSync('admin-app/htmlStr.js', 'utf8');

const oldAI = `if (data.type === 'AI_ASSIGNED') {
        if (window.currentSosAudio) { window.currentSosAudio.pause(); window.currentSosAudio.currentTime = 0; }
        if (typeof closeModal === 'function') closeModal('sosAlertModal');
                            showAdminToast(\`🤖 AI System: \${data.message}\`, 'success');
                            refreshAllModules(); // Refresh tasks
                            return;
                        }`;

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

if (data.includes(oldAI)) {
    data = data.replace(oldAI, newAI);
    console.log("Patched AI_ASSIGNED in admin-app");
} else {
    // Try regex
    const aiRegex = /if \(data\.type === 'AI_ASSIGNED'\) \{\s*if \(window\.currentSosAudio\) \{ window\.currentSosAudio\.pause\(\); window\.currentSosAudio\.currentTime = 0; \}\s*if \(typeof closeModal === 'function'\) closeModal\('sosAlertModal'\);\s*showAdminToast\(`🤖 AI System: \$\{data\.message\}`,\s*'success'\);\s*refreshAllModules\(\); \/\/ Refresh tasks\s*return;\s*\}/s;
    if (aiRegex.test(data)) {
        data = data.replace(aiRegex, newAI);
        console.log("Patched AI_ASSIGNED in admin-app via regex");
    } else {
        console.log("Could not find AI_ASSIGNED logic in admin-app/htmlStr.js");
    }
}

const oldReassign = `if (updateTypes.includes(data.type)) {`;
const newReassign = `if (data.type === 'RESCUE_REQUEST_DECLINED_REASSIGN') {
                            Swal.fire({
                                icon: 'warning',
                                title: 'Rescuer Declined Task',
                                text: 'A rescuer has declined the task. The AI Engine is now searching for the next nearest available unit...',
                                timer: 4000,
                                timerProgressBar: true
                            });
                        }
                        if (updateTypes.includes(data.type)) {`;

if (data.includes(oldReassign)) {
    data = data.replace(oldReassign, newReassign);
    console.log("Patched RESCUE_REQUEST_DECLINED_REASSIGN in admin-app");
} else {
    console.log("Could not find updateTypes.includes in admin-app/htmlStr.js");
}

fs.writeFileSync('admin-app/htmlStr.js', data);

// Do the exact same for Web ADMIN.html to keep them parallel
let webData = fs.readFileSync('system-backend/public/Web ADMIN.html', 'utf8');

const oldAIWeb = `if (data.type === 'AI_ASSIGNED') {
                            showAdminToast(\`🤖 AI System: \${data.message}\`, 'success');
                            if (window.currentSosAudio) { window.currentSosAudio.pause(); window.currentSosAudio.currentTime = 0; }
                            closeModal('sosAlertModal');
                            refreshAllModules(); // Refresh tasks
                            return;
                        }`;

const newAIWeb = `if (data.type === 'AI_ASSIGNED') {
                            Swal.fire({
                                icon: 'info',
                                title: '🤖 AI Task Reassignment',
                                text: data.message,
                                timer: 5000,
                                timerProgressBar: true
                            });
                            if (window.currentSosAudio) { window.currentSosAudio.pause(); window.currentSosAudio.currentTime = 0; }
                            closeModal('sosAlertModal');
                            refreshAllModules(); // Refresh tasks
                            return;
                        }`;

if (webData.includes(oldAIWeb)) {
    webData = webData.replace(oldAIWeb, newAIWeb);
    console.log("Patched AI_ASSIGNED in Web ADMIN.html");
} else {
    const aiWebRegex = /if \(data\.type === 'AI_ASSIGNED'\) \{\s*showAdminToast\(`🤖 AI System: \$\{data\.message\}`,\s*'success'\);\s*if \(window\.currentSosAudio\).+?return;\s*\}/s;
    if (aiWebRegex.test(webData)) {
        webData = webData.replace(aiWebRegex, newAIWeb);
        console.log("Patched AI_ASSIGNED in Web ADMIN.html via regex");
    } else {
        console.log("Could not find AI_ASSIGNED logic in Web ADMIN.html");
    }
}

if (webData.includes(oldReassign)) {
    webData = webData.replace(oldReassign, newReassign);
    console.log("Patched RESCUE_REQUEST_DECLINED_REASSIGN in Web ADMIN.html");
} else {
    console.log("Could not find updateTypes.includes in Web ADMIN.html");
}

fs.writeFileSync('system-backend/public/Web ADMIN.html', webData);
