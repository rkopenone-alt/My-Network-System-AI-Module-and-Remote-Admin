const fs = require('fs');
const path = require('path');

const webAdminPath = path.join(__dirname, 'system-backend', 'public', 'Web ADMIN.html');
const outPath = path.join(__dirname, 'admin-app', 'htmlStr.js');

let htmlContent = fs.readFileSync(webAdminPath, 'utf8');

const offlineWrapperScript = `
<script>
// --- OFFLINE SYNC WRAPPER ---
(function() {
    const originalFetch = window.fetch;
    window.offlineQueue = JSON.parse(localStorage.getItem('adminOfflineQueue') || '[]');

    function saveQueue() {
        localStorage.setItem('adminOfflineQueue', JSON.stringify(window.offlineQueue));
    }

    async function processQueue() {
        if (window.offlineQueue.length === 0) return;
        console.log('[Offline Sync] Processing queue...', window.offlineQueue.length);
        const queueToProcess = [...window.offlineQueue];
        window.offlineQueue = [];
        saveQueue();

        for (const item of queueToProcess) {
            try {
                await originalFetch(item.url, item.options);
                console.log('[Offline Sync] Synced:', item.url);
            } catch (e) {
                console.error('[Offline Sync] Failed to sync, requeueing:', item.url);
                window.offlineQueue.push(item);
                saveQueue();
            }
        }
    }

    window.fetch = async function(url, options) {
        // Only intercept modifying requests
        if (options && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
            try {
                const response = await originalFetch(url, options);
                // If successful, try processing anything that was queued
                processQueue();
                return response;
            } catch (error) {
                console.warn('[Offline Sync] Network failed. Queuing request:', url);
                window.offlineQueue.push({ url, options });
                saveQueue();
                // Return a mock successful response so the UI doesn't break
                return new Response(JSON.stringify({ success: true, queued: true }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        return originalFetch(url, options);
    };

    // Listen for online events
    window.addEventListener('online', processQueue);
    
    // Also try processing queue on load
    setTimeout(processQueue, 2000);
})();
</script>
`;

// Inject before closing head
htmlContent = htmlContent.replace('</head>', offlineWrapperScript + '\n</head>');

// Also update the injected app check
htmlContent = htmlContent.replace('window.__IS_NATIVE_APP__ = true;', 'window.__IS_NATIVE_APP__ = true; window.__IS_ADMIN_APP__ = true;');

const exportedStr = "export const htmlString = `" + htmlContent.replace(/\\/g, '\\\\').replace(/\`/g, '\\`').replace(/\$/g, '\\$') + "`;\n";

// We will write this once admin-app folder exists.
// We write a helper that repeatedly checks until admin-app exists
const checkInterval = setInterval(() => {
    if (fs.existsSync(path.join(__dirname, 'admin-app'))) {
        fs.writeFileSync(outPath, exportedStr, 'utf8');
        console.log('Successfully generated admin-app/htmlStr.js');
        
        // Also update package.json / app.json to rename to Admin App
        const appJsonPath = path.join(__dirname, 'admin-app', 'app.json');
        if (fs.existsSync(appJsonPath)) {
            let appJson = fs.readFileSync(appJsonPath, 'utf8');
            appJson = appJson.replace(/"name": "rescuer-app"/, '"name": "admin-app"')
                             .replace(/"slug": "rescuer-app"/, '"slug": "admin-app"')
                             .replace(/"name": "AntiGravity Rescuer"/, '"name": "AntiGravity Admin"');
            fs.writeFileSync(appJsonPath, appJson, 'utf8');
        }

        const packageJsonPath = path.join(__dirname, 'admin-app', 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            let pkgJson = fs.readFileSync(packageJsonPath, 'utf8');
            pkgJson = pkgJson.replace(/"name": "rescuer-app"/, '"name": "admin-app"');
            fs.writeFileSync(packageJsonPath, pkgJson, 'utf8');
        }
        clearInterval(checkInterval);
    }
}, 2000);

// Stop after 60s
setTimeout(() => clearInterval(checkInterval), 60000);
