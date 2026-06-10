import os
import re

file_path = r'C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\system-backend\public\Web ADMIN.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

sync_engine_script = """
    <!-- OFFLINE SYNC ENGINE -->
    <script>
        (function() {
            const CACHE_PREFIX = 'ardms_cache_';
            const QUEUE_KEY = 'ardms_sync_queue';
            
            const originalFetch = window.fetch;
            
            // Helper to save requests
            function enqueueRequest(url, options) {
                const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
                queue.push({
                    id: Date.now().toString(),
                    url,
                    options: {
                        method: options.method,
                        headers: options.headers,
                        body: options.body
                    },
                    timestamp: Date.now()
                });
                localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
                console.log('[Sync Engine] Queued offline request:', url);
                if (typeof showAdminToast === 'function') {
                    showAdminToast('Offline: Command queued for sync', 'warning');
                }
            }

            // Sync Queue Process
            async function processSyncQueue() {
                if (!navigator.onLine) return;
                const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
                if (queue.length === 0) return;
                
                console.log(`[Sync Engine] Processing ${queue.length} queued requests...`);
                
                let successCount = 0;
                let newQueue = [...queue];
                
                for (let i = 0; i < queue.length; i++) {
                    const req = queue[i];
                    try {
                        const res = await originalFetch(req.url, req.options);
                        if (res.ok) {
                            successCount++;
                            newQueue = newQueue.filter(r => r.id !== req.id);
                        } else {
                            // If server responded with error, we still remove it so we don't infinitely retry bad requests,
                            // UNLESS it's a 502/503/504 indicating the server is actually down.
                            if (res.status >= 500) throw new Error("Server down");
                            newQueue = newQueue.filter(r => r.id !== req.id);
                        }
                    } catch (e) {
                        console.warn('[Sync Engine] Queue sync failed for', req.url, e);
                        break; // Stop processing, network still bad
                    }
                }
                
                localStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
                if (successCount > 0 && typeof showAdminToast === 'function') {
                    showAdminToast(`Reconnected: Synced ${successCount} offline command(s)`, 'success');
                }
            }

            // Hook global fetch
            window.fetch = async function(url, options = {}) {
                const method = options.method || 'GET';
                const isApi = typeof url === 'string' && url.includes('/api/');
                
                if (!navigator.onLine && isApi) {
                    if (method === 'GET') {
                        const cached = localStorage.getItem(CACHE_PREFIX + url);
                        if (cached) {
                            console.log('[Sync Engine] Serving from cache:', url);
                            return new Response(cached, { status: 200, headers: { 'Content-Type': 'application/json' } });
                        }
                        throw new TypeError("Failed to fetch");
                    } else {
                        enqueueRequest(url, options);
                        return new Response(JSON.stringify({ success: true, queued: true, message: 'Saved offline' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
                    }
                }

                try {
                    const response = await originalFetch(url, options);
                    
                    if (isApi && response.ok) {
                        if (method === 'GET') {
                            const clone = response.clone();
                            const text = await clone.text();
                            localStorage.setItem(CACHE_PREFIX + url, text);
                        }
                    }
                    
                    return response;
                } catch (e) {
                    if (isApi) {
                        if (method === 'GET') {
                            const cached = localStorage.getItem(CACHE_PREFIX + url);
                            if (cached) {
                                console.log('[Sync Engine] Serving from cache (network failed):', url);
                                return new Response(cached, { status: 200, headers: { 'Content-Type': 'application/json' } });
                            }
                        } else {
                            enqueueRequest(url, options);
                            return new Response(JSON.stringify({ success: true, queued: true, message: 'Saved offline' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
                        }
                    }
                    throw e;
                }
            };

            window.addEventListener('online', () => {
                setTimeout(processSyncQueue, 1500);
            });

            setInterval(() => {
                if (navigator.onLine) processSyncQueue();
            }, 10000);

        })();
    </script>
</head>"""

if '<!-- OFFLINE SYNC ENGINE -->' not in html:
    html = html.replace('</head>', sync_engine_script)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Sync Engine injected.")
else:
    print("Sync Engine already exists.")
