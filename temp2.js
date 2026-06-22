

        // --- OFFLINE SYNC MANAGER ---
        const originalFetch = window.fetch;
        window.offlineQueue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
        window.fetch = async function(url, options) {
            const isMutation = options && ['POST', 'PUT', 'DELETE'].includes(options.method);
            if (!navigator.onLine && isMutation) {
                console.log('[OFFLINE] Queuing request', url);
                window.offlineQueue.push({ url, options });
                localStorage.setItem('offline_queue', JSON.stringify(window.offlineQueue));
                return new Response(JSON.stringify({ success: true, offline: true, id: Date.now() }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            
            try {
                const res = await originalFetch(url, options);
                if (options === undefined || options.method === 'GET' || !options.method) {
                    if (url.includes('/history') || url.includes('/rescue-requests') || url.includes('/dashboard-stats') || url.includes('/zones') || url.includes('/users')) {
                        const clone = res.clone();
                        clone.text().then(data => {
                            localStorage.setItem('cache_' + url, data);
                        }).catch(() => {});
                    }
                }
                return res;
            } catch (e) {
                if (!navigator.onLine) {
                    if (isMutation) {
                        window.offlineQueue.push({ url, options });
                        localStorage.setItem('offline_queue', JSON.stringify(window.offlineQueue));
                        return new Response(JSON.stringify({ success: true, offline: true, id: Date.now() }), { status: 200, headers: { 'Content-Type': 'application/json' } });
                    } else {
                        const cached = localStorage.getItem('cache_' + url);
                        if (cached) {
                            return new Response(cached, { status: 200, headers: { 'Content-Type': 'application/json' } });
                        }
                    }
                }
                throw e;
            }
        };

        window.addEventListener('online', async () => {
            console.log('[ONLINE] Syncing offline queue...');
            const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
            window.offlineQueue = [];
            localStorage.setItem('offline_queue', '[]');
            for (const req of queue) {
                try {
                    await originalFetch(req.url, req.options);
                } catch (e) {
                    console.error('Failed to sync', req, e);
                }
            }
            if (window.core && window.core.refresh) window.core.refresh();
            if (window.core && window.core.updateNetUI) window.core.updateNetUI(true);
        });
        // -----------------------------


        // Timezone conversion helpers
        function formatLocalTime(dbTimeStr) {
            if (!dbTimeStr) return '--:--';
            let t = dbTimeStr.trim();
            if (!t.includes('T')) t = t.replace(' ', 'T');
            if (!t.endsWith('Z') && !t.includes('+')) t += 'Z';
            try {
                const d = new Date(t);
                if (isNaN(d)) return dbTimeStr;
                let h = d.getHours();
                let m = d.getMinutes();
                const ampm = h >= 12 ? 'PM' : 'AM';
                h = h % 12;
                h = h ? h : 12;
                m = m < 10 ? '0' + m : m;
                return h + ':' + m + ' ' + ampm;
            } catch(e) { return dbTimeStr; }
        }

        function formatLocalDate(dbTimeStr) {
            if (!dbTimeStr) return '--/--/----';
            let t = dbTimeStr.trim();
            if (!t.includes('T')) t = t.replace(' ', 'T');
            if (!t.endsWith('Z') && !t.includes('+')) t += 'Z';
            try {
                const d = new Date(t);
                if (isNaN(d)) return dbTimeStr;
                return d.toLocaleString();
            } catch(e) { return dbTimeStr; }
        }

        const core = {
            API: `http://${window.location.hostname || 'localhost'}:3001/api`,
            WS_URL: `ws://${window.location.hostname || 'localhost'}:3001`,
            user: {
                name: "Arjun Singh",
                serial_number: "PUB-1024",
                phone: "918000000099"
            },
            notifications: [],
            unreadNotifCount: 0,

            toggleNotificationHistory() {
                const pop = document.getElementById('notificationHistoryPopup');
                if (!pop) return;
                if (pop.style.display === 'flex') {
                    pop.style.display = 'none';
                } else {
                    pop.style.display = 'flex';
                    this.unreadNotifCount = 0;
                    this.updateNotifBadge();
                    this.renderNotifications();
                }
            },

            clearNotifications() {
                this.notifications = [];
                localStorage.setItem('citizen_notifications', JSON.stringify(this.notifications));
                this.unreadNotifCount = 0;
                this.updateNotifBadge();
                this.renderNotifications();
                this.toast('NOTIFICATIONS CLEARED', '🗑️');
            },

            addNotification(title, body, icon = '🔔') {
                const notif = {
                    title,
                    body,
                    icon,
                    timestamp: new Date().toISOString()
                };
                this.notifications.unshift(notif);
                if (this.notifications.length > 50) this.notifications.pop();
                localStorage.setItem('citizen_notifications', JSON.stringify(this.notifications));
                
                const pop = document.getElementById('notificationHistoryPopup');
                if (!pop || pop.style.display !== 'flex') {
                    this.unreadNotifCount++;
                    this.updateNotifBadge();
                } else {
                    this.renderNotifications();
                }
            },

            updateNotifBadge() {
                const badge = document.getElementById('notifBadgeCount');
                if (!badge) return;
                if (this.unreadNotifCount > 0) {
                    badge.innerText = this.unreadNotifCount;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            },

            renderNotifications() {
                const list = document.getElementById('notificationHistoryList');
                if (!list) return;
                if (this.notifications.length === 0) {
                    list.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#64748b; font-size:13px; font-weight:600;">No notifications received yet.</div>`;
                    return;
                }
                list.innerHTML = this.notifications.map(n => {
                    const nd = new Date(n.timestamp);
                    let h = nd.getHours(); let m = nd.getMinutes();
                    const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12; h = h ? h : 12; m = m < 10 ? '0' + m : m;
                    const time = h + ':' + m + ' ' + ampm;
                    const date = nd.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    return `
                        <div style="background:#1e293b; border:1px solid #334155; padding:15px; border-radius:14px; display:flex; gap:12px; align-items:flex-start; box-shadow:var(--shadow-sm); margin-bottom: 8px;">
                            <div style="font-size:24px; background:#0f172a; padding:10px; border-radius:12px; border:1px solid #334155; display:flex; align-items:center; justify-content:center; width:44px; height:44px; flex-shrink:0;">${n.icon}</div>
                            <div style="flex:1;">
                                <div style="display:flex; justify-content:between; align-items:center; margin-bottom:4px; gap:8px;">
                                    <h4 style="margin:0; font-size:14px; font-weight:900; color:white; flex:1;">${n.title}</h4>
                                    <span style="font-size:10px; color:#64748b; font-weight:800; text-transform:uppercase;">${date} ${time}</span>
                                </div>
                                <p style="margin:0; font-size:12px; font-weight:600; color:#94a3b8; line-height:1.4;">${n.body}</p>
                            </div>
                        </div>
                    `;
                }).join('');
            },
            sosTimer: null,
            socket: null,
            mode: 'medical',
            needs: { people: 1, food: 0, med: 0, sanitary: 0, photo: null, route: null },
            retryQueue: [],
            backoff: [3000, 7000, 12000],
            currentLocation: { lat: 13.085, lng: 80.272 },
            isSimulating: false,
            mediaCapabilities: {
                image: true,
                mic: true
            },
            sosBufferMinutes: 15,

            updateBufferCooldown() {
                const banner = document.getElementById('bufferCooldownBanner');
                const timerSpan = document.getElementById('bufferCooldownTimer');
                const selectBanner = document.getElementById('selectionBufferCooldownBanner');
                const selectText = document.getElementById('selectionBufferCooldownText');
                if (!banner || !timerSpan) return;

                const lastSOSTime = parseInt(localStorage.getItem('lastSOSTime') || '0');
                const dynamicLockedUntil = lastSOSTime > 0 ? lastSOSTime + ((this.sosBufferMinutes || 15) * 60 * 1000) : 0;
                let staticLockedUntil = parseInt(localStorage.getItem('sosLockedUntil') || '0');
                if (staticLockedUntil > dynamicLockedUntil && dynamicLockedUntil > 0) {
                    staticLockedUntil = dynamicLockedUntil;
                    localStorage.setItem('sosLockedUntil', staticLockedUntil.toString());
                }
                const lockedUntil = Math.max(dynamicLockedUntil, staticLockedUntil);

                const remaining = Math.max(0, Math.floor((lockedUntil - Date.now()) / 1000));

                if (remaining > 0) {
                    banner.style.display = 'block';
                    const mins = Math.floor(remaining / 60);
                    const secs = remaining % 60;
                    timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                    if (selectBanner && selectText) {
                        selectBanner.style.display = 'flex';
                        selectText.innerText = `Please wait ${mins}m ${secs}s before triggering another request.`;
                    }
                } else {
                    banner.style.display = 'none';
                    if (selectBanner) {
                        selectBanner.style.display = 'none';
                    }
                }
            },

            setManualLocation() {
                const lat = parseFloat(document.getElementById('manualLat').value);
                const lng = parseFloat(document.getElementById('manualLng').value);
                if (isNaN(lat) || isNaN(lng)) {
                    this.toast('PLEASE ENTER VALID COORDINATES', '⚠️');
                    return;
                }
                this.currentLocation.lat = lat;
                this.currentLocation.lng = lng;
                
                // Also update the Settings fields if they exist
                const overLat = document.getElementById('overLat');
                const overLng = document.getElementById('overLng');
                if (overLat) overLat.value = lat;
                if (overLng) overLng.value = lng;

                document.getElementById('locationPopup').style.display = 'none';
                this.renderLocationBar('on');
                this.toast('LOCATION SET MANUALLY', '📍');
            },

            toggleSimulation() {
                this.isSimulating = !this.isSimulating;
                this.toast(`SIMULATION ${this.isSimulating ? 'ENABLED' : 'DISABLED'}`, '🧪');
                if (this.isSimulating) {
                    this.startLocationSimulation();
                } else {
                    if (this.simTimer) clearInterval(this.simTimer);
                    this.startLocationTracking();
                }
            },

            startLocationSimulation() {
                if (this.simTimer) clearInterval(this.simTimer);
                if (this.locationWatcher) navigator.geolocation.clearWatch(this.locationWatcher);
                // Simulation mode simply locks the current coordinates without drifting
                console.log('[SIM] Locked Lat:', this.currentLocation.lat, 'Lng:', this.currentLocation.lng);
            },
            locationWatcher: null,

            startLocationTracking() {
                const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (!navigator.geolocation || !isSecure) {
                    console.warn("Insecure context or no geolocation, using simulation/manual location.");
                    this.renderLocationBar('file_off');
                    document.getElementById('locationPopup').style.display = 'none';
                    return;
                }

                document.getElementById('locationPopup').style.display = 'none';

                this.locationWatcher = navigator.geolocation.watchPosition(
                    (position) => {
                        this.currentLocation.lat = position.coords.latitude;
                        this.currentLocation.lng = position.coords.longitude;
                        document.getElementById('locationPopup').style.display = 'none';
                    },
                    (error) => {
                        console.error("Location error:", error);
                        if (error.code === 1) { // Permission Denied
                            this.renderLocationBar('denied');
                        } else {
                            document.getElementById('locationPopup').style.display = 'flex';
                        }
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
                this.updateLocationStatus();
            },

            updateLocationStatus() {
                const bar = document.getElementById('locStatusBar');
                if (!bar) return;
                bar.style.display = 'flex';

                if (!navigator.geolocation) {
                    this.renderLocationBar('unsupported');
                    return;
                }

                if (window.location.protocol === 'file:') {
                    // file:// protocol often blocks geolocation
                    navigator.geolocation.getCurrentPosition(
                        () => this.renderLocationBar('on'),
                        (err) => {
                            if (err.code === 1) this.renderLocationBar('denied');
                            else this.renderLocationBar('file_off');
                        },
                        { timeout: 3000 }
                    );
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    () => this.renderLocationBar('on'),
                    (err) => {
                        if (err.code === 1) this.renderLocationBar('denied');
                        else this.renderLocationBar('off');
                    },
                    { timeout: 5000, enableHighAccuracy: true }
                );
            },

            renderLocationBar(status) {
                const bar = document.getElementById('locStatusBar');
                if (!bar) return;

                let message = "Location Auto detect ON";
                let btn = "";
                let type = "on";
                let dotColor = "var(--secondary)";

                switch (status) {
                    case 'on':
                        type = "on";
                        break;
                    case 'denied':
                        message = "Location Access Denied - check browser settings";
                        btn = '<button class="loc-btn-fix" onclick="core.startLocationTracking()">ALLOW</button>';
                        type = "off";
                        dotColor = "var(--danger)";
                        break;
                    case 'file_off':
                        message = "Browser blocks location on local files (file://)";
                        btn = '<button class="loc-btn-fix" onclick="window.alert(\'To fix this, please run the app through a local server or use the mobile APK.\')">HELP</button>';
                        type = "off";
                        dotColor = "var(--warning)";
                        break;
                    case 'unsupported':
                        message = "Geolocation not supported in this browser";
                        type = "off";
                        dotColor = "var(--danger)";
                        break;
                    default:
                        message = "Location setting OFF - need to turn on";
                        btn = '<button class="loc-btn-fix" onclick="core.startLocationTracking()">ENABLE</button>';
                        type = "off";
                        dotColor = "var(--danger)";
                }

                bar.className = `loc-status-bar loc-status-${type === 'on' ? 'on' : 'off'}`;
                bar.innerHTML = `
                    <div style="display:flex; align-items:center;">
                        <div class="loc-dot" style="background:${dotColor}"></div>
                        <span style="margin-right:8px;">${message}</span>
                    </div>
                    <div style="display:flex; gap:5px;">
                        ${btn}
                        <button class="loc-btn-fix" style="background:var(--primary); color:white; border:none;" onclick="core.showScreen('screenSettings')">MANUAL</button>
                    </div>
                `;
            },

            async init() {
                // Guarantee a completely clean login session on first launching a fresh installation or update
                if (localStorage.getItem('app_installed_launch') !== 'true') {
                    localStorage.removeItem('citizen_token');
                    localStorage.removeItem('citizen_user');
                    localStorage.setItem('app_installed_launch', 'true');
                }

                this.notifications = JSON.parse(localStorage.getItem('citizen_notifications') || '[]');
                this.unreadNotifCount = 0;
                this.updateNotifBadge();
                this.setupKeyboardHandling();
                this.bootstrap(); // Initialize header with dummy data or state
                const savedToken = localStorage.getItem('citizen_token');
                const savedUser = localStorage.getItem('citizen_user');
                if (savedToken && savedUser) {
                    this.showLoader(true);
                    try {
                        const res = await fetch(`${this.API}/auth/verify`, {
                            headers: { 'Authorization': `Bearer ${savedToken}` }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (!data.user || data.user.role !== 'public') {
                                this.logout();
                                return;
                            }
                            this.user = data.user;
                            localStorage.setItem('citizen_user', JSON.stringify(this.user));
                            this.showScreen('screenEmergencyType');
                            this.bootstrap();
                            this.connectGateway();
                            this.startLocationTracking();
                            document.getElementById('globalNotificationPanel').classList.add('active');
                            this.updateGlobalNotification('System Ready', 'Connected to Rescue Network', '📡', 'Live');
                        } else {
                            this.logout();
                        }
                    } catch (e) {
                        // Offline mode: proceed with local data if network fails
                        console.log("Offline mode, relying on local session");
                        this.user = JSON.parse(savedUser);
                        this.showScreen('screenEmergencyType');
                        this.bootstrap();
                        this.connectGateway();
                        this.startLocationTracking();
                    } finally {
                        this.showLoader(false);
                    }
                }
                this.updateLocationStatus();
                setInterval(() => this.updateLocationStatus(), 10000);
                await this.fetchSettings();
                this.updateBufferCooldown();
                setInterval(() => this.updateBufferCooldown(), 1000);
                this.processRetryQueue();
            },

            async fetchSettings() {
                try {
                    const res = await fetch(`${this.API}/settings`);
                    const settings = await res.json();
                    if (settings.system_name) {
                        const brandEls = document.querySelectorAll('.brand-name');
                        brandEls.forEach(el => el.innerText = settings.system_name);
                    }
                    if (settings.retry_intervals) {
                        const intervals = settings.retry_intervals.split(',').map(s => parseInt(s.trim()) * 1000);
                        if (intervals.length > 0 && !intervals.some(isNaN)) {
                            this.backoff = intervals;
                            console.log('[SYNC] Retry intervals updated:', this.backoff);
                        }
                    }

                    if (settings.refresh_interval) {
                        const newInterval = parseInt(settings.refresh_interval);
                        if (newInterval > 0 && newInterval !== this.refreshInterval) {
                            console.log(`[SYNC] Refresh interval updated to ${newInterval}s`);
                            this.refreshInterval = newInterval;
                            const el = document.getElementById('dispSyncInterval');
                            if (el) el.innerText = this.refreshInterval + 's (Admin Set)';
                        }
                    }

                    if (settings.public_image_enabled !== undefined) {
                        this.mediaCapabilities.image = settings.public_image_enabled === 'true';
                    }
                    if (settings.public_mic_enabled !== undefined) {
                        this.mediaCapabilities.mic = settings.public_mic_enabled === 'true';
                    }
                    if (settings.sos_buffer_minutes !== undefined) {
                        this.sosBufferMinutes = parseInt(settings.sos_buffer_minutes) || 15;
                    }
                    this.applyMediaSettings();

                } catch (e) { console.error('[SYNC] Failed to fetch settings', e); }
            },

            applyMediaSettings() {
                // Apply Image/Camera restrictions
                const critPhotoBtn = document.getElementById('critPhotoBtn');
                if (critPhotoBtn) {
                    critPhotoBtn.style.opacity = this.mediaCapabilities.image ? '1' : '0.5';
                    critPhotoBtn.style.pointerEvents = this.mediaCapabilities.image ? 'auto' : 'none';
                }
                const photoCard = document.querySelector('div[onclick="core.openCamera()"]');
                if (photoCard) {
                    photoCard.style.opacity = this.mediaCapabilities.image ? '1' : '0.5';
                    photoCard.style.pointerEvents = this.mediaCapabilities.image ? 'auto' : 'none';
                }

                // Apply Mic restrictions
                const micCard = document.querySelector('div[onclick*="Voice input currently disabled"]');
                if (micCard) {
                    micCard.style.opacity = this.mediaCapabilities.mic ? '1' : '0.5';
                    micCard.style.pointerEvents = this.mediaCapabilities.mic ? 'auto' : 'none';
                }
            },

            async login() {
                const phone = document.getElementById('inpId').value;
                const pin = document.getElementById('inpPin').value;
                const err = document.getElementById('loginError');

                let localDeviceId = localStorage.getItem('citizen_device_id');
                if (!localDeviceId) {
                    localDeviceId = 'PUBDEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                    localStorage.setItem('citizen_device_id', localDeviceId);
                }

                console.log('[LOGIN] Attempting login...', { idOrPhone: phone, pin, deviceId: localDeviceId });
                this.showLoader(true);
                try {
                    const res = await fetch(`${this.API}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idOrPhone: phone, pin, deviceId: localDeviceId })
                    });
                    console.log('[LOGIN] Response status:', res.status);

                    if (res.ok) {
                        const data = await res.json();
                        if (!data.user || data.user.role !== 'public') {
                            err.innerText = "ACCESS DENIED - CITIZENS ONLY";
                            err.style.display = 'block';
                            this.showLoader(false);
                            return;
                        }
                        this.user = data.user;
                        localStorage.setItem('citizen_token', data.token);
                        localStorage.setItem('citizen_user', JSON.stringify(this.user));
                        this.showScreen('screenEmergencyType');
                        this.bootstrap();
                        this.connectGateway();
                        this.startLocationTracking();
                        document.getElementById('globalNotificationPanel').classList.add('active');
                        this.updateGlobalNotification('Welcome', `Logged in as ${this.user.name}`, '👤', 'Live');
                    } else {
                        const errData = await res.json();
                        err.innerText = errData.error || "INVALID CREDENTIALS";
                        err.style.display = 'block';
                    }
                } catch (e) {
                    console.error("Login failed", e);
                    err.innerText = "NETWORK ERROR OR SERVER DOWN";
                    err.style.display = 'block';
                } finally {
                    this.showLoader(false);
                }
            },

            logout() {
                localStorage.removeItem('citizen_token');
                localStorage.removeItem('citizen_user');
                
                // Clear all history cache entries
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('cached_my_history_')) {
                        localStorage.removeItem(key);
                    }
                }
                this.rawData.myHistory = []; // Reset local memory
                
                if (this.socket) {
                    try {
                        this.socket.onclose = null;
                        this.socket.close();
                    } catch(e) {}
                    this.socket = null;
                }
                this.user = null;
                this.showScreen('screenLogin');
                this.toast("LOGGED OUT", "🔑");
            },

            clearCache() {
                localStorage.removeItem(`cached_my_history_${this.user ? this.user.phone : ''}`);
                localStorage.removeItem('offlineRequests');
                if (this.socket) {
                    try {
                        this.socket.onclose = null;
                        this.socket.close();
                    } catch(e) {}
                    this.socket = null;
                }
                this.toast("CACHE CLEARED", "🧹");
                this.user = null;
                this.showScreen('screenLogin');
            },

            refreshInterval: 15,
            syncTimer: null,

            bootstrap() {
                document.getElementById('dispName').innerText = this.user.name;
                document.getElementById('profName').innerText = this.user.name;
                document.getElementById('profId').innerText = `ID: ${this.user.serial_number || 'PUB-01'}`;
                
                // Update Header
                const headerName = document.getElementById('headerUserName');
                const headerDetails = document.getElementById('headerUserDetails');
                if (headerName) headerName.innerText = this.user.name;
                if (headerDetails) {
                    headerDetails.innerText = `ID: ${this.user.serial_number || 'PUB-01'} | MOB: ${this.user.phone || 'N/A'}`;
                }

                const runSync = async () => {
                    await this.fetchSettings();
                    await this.fetchMyHistory();
                    this.syncTimer = setTimeout(runSync, this.refreshInterval * 1000);
                };
                runSync();
            },

            updateGlobalNotification(title, body, icon, status) {
                const panel = document.getElementById('globalNotificationPanel');
                if (!panel) return;
                
                const titleEl = document.getElementById('globalNotifTitle');
                const bodyEl = document.getElementById('globalNotifBody');
                const iconEl = document.getElementById('globalNotifIcon');
                const statusEl = document.getElementById('globalNotifStatus');

                if (titleEl) titleEl.innerText = title;
                if (bodyEl) bodyEl.innerText = body;
                if (iconEl) iconEl.innerText = icon || '📡';
                if (statusEl) {
                    statusEl.innerText = status || 'Live';
                    statusEl.style.background = status === 'Critical' ? 'var(--danger)' : 'var(--primary)';
                }

                panel.classList.add('active');
            },

            connectGateway() {
                console.log('[GATEWAY] Connecting...');
                this.socket = new WebSocket(this.WS_URL);

                this.socket.onopen = async () => {
                    console.log('[GATEWAY] Connected');
                    this.socket.send(JSON.stringify({
                        type: 'REGISTER',
                        deviceId: this.user.serial_number || this.user.phone,
                        room: 'public_broadcast'
                    }));
                    await this.fetchSettings(); // Refresh settings on reconnect
                };

                this.socket.onmessage = (msg) => {
                    const { type, data } = JSON.parse(msg.data);
                    this.handleGatewayMessage(type, data);
                };

                this.socket.onclose = () => {
                    console.log('[GATEWAY] Offline, reconnecting in 5s...');
                    setTimeout(() => this.connectGateway(), 5000);
                };
            },

            getDistance(lat1, lon1, lat2, lon2) {
                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            },

            handleGatewayMessage(type, data) {
                if (type === 'USER_DISABLED' || type === 'FORCE_LOGOUT') {
                    this.addNotification('Account Disabled', data?.reason || 'Account disabled by administrator', '🚫');
                    this.toast(data?.reason || 'ACCOUNT DISABLED BY ADMIN', '🚫');
                    setTimeout(() => this.logout(), 2000);
                }
                if (type === 'RESCUE_REQUEST_COMPLETED') {
                    // Check if it's our request (the system sync might be more robust, but this provides instant feedback)
                    this.addNotification('Mission Completed', 'Mission accomplished by Citizen ARDMS Team', '✅');
                    this.updateStatusUI('COMPLETED', 'Mission accomplished by Citizen ARDMS Team', '✅');
                    this.toast('Citizen ARDMS operation marked as completed!', '✅');
                    if (this.rescuerMarker) {
                        this.map.removeLayer(this.rescuerMarker);
                        this.rescuerMarker = null;
                    }
                }
                if (type === 'RESCUER_UPDATE' || type === 'LIVE_LOCATION_UPDATE') {
                    // Check if this update comes from the assigned rescuer team
                    // For now, if there is an active mission, we show any incoming rescuer location as the incoming team
                    // In a production system, we'd check if the data.deviceId belongs to the assigned group
                    
                    const dist = this.getDistance(this.currentLocation.lat, this.currentLocation.lng, data.lat, data.lng);
                    
                    if (dist < 1) {
                        this.updateStatusUI('NEARBY', `Rescuer ${data.name || 'Team'} is arriving (${dist.toFixed(1)}km)`, '🏢');
                        this.updateGlobalNotification('Rescuer Nearby', `${data.name || 'Team'} is arriving now!`, '🏢', 'Near');
                    } else if (dist < 5) {
                        this.updateStatusUI('APPROACHING', `Rescuer ${data.name || 'Team'} in transit (${dist.toFixed(1)}km)`, '🚁');
                        this.updateGlobalNotification('Rescuer En Route', `${data.name || 'Team'} is ${dist.toFixed(1)}km away`, '🚁', 'Moving');
                    } else {
                        this.updateStatusUI('DISPATCHED', `Team assigned: ${data.name || 'Team'} (${dist.toFixed(1)}km)`, '🚨');
                        this.updateGlobalNotification('Team Dispatched', `${data.name || 'Team'} assigned to your SOS`, '🚨', 'Assigned');
                    }

                    // Plot the live rescuer location on the map
                    if (!this.rescuerMarker) {
                        const rIcon = L.divIcon({ 
                            className: 'rescuer-marker', 
                            html: `<div style="background:url('official_rescuer_icon.png'); background-size:cover; width:48px; height:48px; border-radius:50%; border:3px solid white; box-shadow:0 0 20px rgba(220, 38, 38, 0.6);"></div>`, 
                            iconSize: [48, 48] 
                        });
                        this.rescuerMarker = L.marker([data.lat, data.lng], { icon: rIcon }).addTo(this.map);
                    } else {
                        this.rescuerMarker.setLatLng([data.lat, data.lng]);
                    }
                    
                    // Keep both markers in view
                    const bounds = L.latLngBounds([[this.currentLocation.lat, this.currentLocation.lng], [data.lat, data.lng]]);
                    this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
                }
                if (type === 'RESCUE_REQUEST_ACCEPTED') {
                    if (data.phone === this.user.phone || data.device_id === this.user.serial_number) {
                        this.addNotification('SOS Request Accepted', `Team "${data.assignedName}" is en route to your location.`, '🚨');
                        this.updateStatusUI('TEAM_ASSIGNED', 'Rescue team has been dispatched!', '🚨');
                        this.updateGlobalNotification('Mission Accepted', `Team "${data.assignedName}" is en route`, '🚨', 'Active');
                        this.toast('MISSION ACCEPTED: TEAM EN ROUTE', '✅');
                        this.showMissionAlert(`TEAM DISPATCHED`, `The rescue team "${data.assignedName}" is now moving to your location. Stay calm and follow instructions.`);
                        this.fetchMyHistory();
                    }
                }
                if (type === 'RESCUE_REQUEST_COMPLETED') {
                    if (data.phone === this.user.phone || data.device_id === this.user.serial_number) {
                        this.addNotification('SOS Request Completed', 'Your rescue operation has been marked as completed. You are safe!', '🏅');
                        this.updateStatusUI('COMPLETED', 'Rescue mission successful!', '✅');
                        this.toast('MISSION COMPLETE', '🏅');
                        this.showMissionAlert(`MISSION COMPLETED`, `You are safe! The rescue operation has been marked as successful. Reach out if you need more help.`);
                        this.fetchMyHistory();
                    }
                }
                if (type === 'ADMIN_MESSAGE') {
                    this.addNotification('Message from Admin', data.message, '💬');
                    this.showMissionAlert('MESSAGE FROM ADMIN', data.message);
                    this.toast('NEW MESSAGE RECEIVED', '💬');
                }
                if (type === 'NEW_COMMAND') {
                    this.addNotification('Task Dispatched', `A new mission "${data.desc || 'Rescue Task'}" has been assigned.`, '🚨');
                    this.showMissionAlert('NEW MISSION ASSIGNED', `A new mission "${data.desc || 'Rescue Task'}" has been assigned to you/your group.`);
                    this.toast('MISSION ASSIGNED', '🚨');
                    this.fetchMyHistory();
                }
                if (type === 'BUFFER_TIME_UPDATE') {
                    this.sosBufferMinutes = parseInt(data.minutes) || 15;
                    this.updateBufferCooldown();
                    console.log('[GATEWAY] Live SOS buffer time update (via BUFFER_TIME_UPDATE):', this.sosBufferMinutes);
                    this.toast(`Emergency Buffer Updated: ${this.sosBufferMinutes}m`, '⏳');
                }
                if (type === 'SETTINGS_UPDATED') {
                    if (data.key === 'retry_intervals') {
                        const intervals = data.value.split(',').map(s => parseInt(s.trim()) * 1000);
                        if (intervals.length > 0 && !intervals.some(isNaN)) {
                            this.backoff = intervals;
                            console.log('[SYNC] Live retry intervals update:', this.backoff);
                            this.toast('Sync Config Updated', '⚙️');
                        }
                    } else if (data.key === 'sos_buffer_minutes') {
                        this.sosBufferMinutes = parseInt(data.value) || 15;
                        this.updateBufferCooldown();
                        console.log('[GATEWAY] Live SOS buffer time update:', this.sosBufferMinutes);
                        this.toast(`Emergency Buffer Updated: ${this.sosBufferMinutes}m`, '⏳');
                    } else if (data.key === 'refresh_interval') {
                        this.refreshInterval = parseInt(data.value) || 15;
                        const el = document.getElementById('dispSyncInterval');
                        if (el) el.innerText = this.refreshInterval + 's (Admin Set)';
                        console.log('[GATEWAY] Live refresh interval update:', this.refreshInterval);
                    }
                }
            },

            showMissionAlert(title, msg) {
                const overlay = document.createElement('div');
                overlay.className = 'mission-alert-overlay';
                overlay.innerHTML = `
                    <div class="mission-alert-card">
                        <div class="alert-header">
                            <div class="alert-icon">🔔</div>
                            <h3>${title}</h3>
                        </div>
                        <p>${msg}</p>
                        <button onclick="this.closest('.mission-alert-overlay').remove()" style="background: var(--primary); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s;">DISMISS</button>
                    </div>
                `;
                document.body.appendChild(overlay);
            },

            async fetchMyHistory() {
                try {
                    const phoneParams = `phone=${encodeURIComponent(this.user.phone)}&device_id=${encodeURIComponent(this.user.serial_number)}`;
                    const res = await fetch(`${this.API}/rescue-requests/my-history?${phoneParams}`);
                    if (res.ok) {
                        const data = await res.json();
                        this.rawData.myHistory = data;
                        localStorage.setItem(`cached_my_history_${this.user.phone}`, JSON.stringify(this.rawData.myHistory));
                        this.renderStatusUI();
                        
                        // Update ticker based on active request
                        const activeReq = this.rawData.myHistory.find(r => r.status !== 'completed' && r.status !== 'declined');
                        if (activeReq) {
                            if (activeReq.status === 'accepted') this.updateStatusUI('TEAM_ASSIGNED', 'Rescue team has been dispatched!', '🚨');
                            else if (activeReq.status === 'assigned') this.updateStatusUI('DISPATCHED', 'Team assigned, pending acceptance.', '🚨');
                            else if (activeReq.status === 'ongoing') this.updateStatusUI('APPROACHING', 'Rescue team is on the way!', '🚁');
                            else this.updateStatusUI('PENDING', 'Waiting for available team...', '⏳');
                        } else {
                            const ticker = document.getElementById('sosStatusTicker');
                            if (ticker) ticker.style.display = 'none';
                        }
                    } else {
                        throw new Error('Server non-ok response');
                    }
                } catch (e) {
                    console.error("History fetch failed, trying local cache:", e);
                    const cached = localStorage.getItem(`cached_my_history_${this.user.phone}`);
                    if (cached) {
                        this.rawData.myHistory = JSON.parse(cached);
                        this.renderStatusUI();
                    }
                }
            },

            emergencyCategory: null,

            setEmergencyCategory(cat) {
                this.emergencyCategory = cat;
                document.getElementById('btnSelectCritical').style.borderColor = cat === 'critical' ? '#e11d48' : '#fecdd3';
                document.getElementById('btnSelectCritical').style.background = cat === 'critical' ? '#fff1f2' : '#ffffff';
                
                document.getElementById('btnSelectNormal').style.borderColor = cat === 'normal' ? '#d97706' : '#fef3c7';
                document.getElementById('btnSelectNormal').style.background = cat === 'normal' ? '#fffbeb' : '#ffffff';

                const proceedBtn = document.getElementById('btnConfirmProceed');
                proceedBtn.disabled = false;
                proceedBtn.style.opacity = '1';
                this.toast(`${cat.toUpperCase()} CATEGORY SELECTED`, '✅');
            },

            proceedFromSelection() {
                if (this.emergencyCategory === 'critical') {
                    this.mode = 'sos';
                    // Reset styling of critical action buttons
                    document.querySelectorAll('.critical-action-btn').forEach(btn => {
                        btn.style.background = 'white';
                        if (btn.querySelector('h3').innerText.toLowerCase() === 'pregnancy') {
                            btn.style.borderColor = '#fb7185';
                        } else {
                            btn.style.borderColor = '#38bdf8';
                        }
                    });
                    this.showScreen('screenCriticalSOS');
                } else {
                    this.showScreen('screenForm');
                }
            },

            triggerQuickSOS(type) {
                if (this.mode === type) {
                    this.mode = 'sos';
                    document.querySelectorAll('.critical-action-btn').forEach(btn => {
                        btn.style.background = 'white';
                        if (btn.querySelector('h3').innerText.toLowerCase() === 'pregnancy') {
                            btn.style.borderColor = '#fb7185';
                        } else {
                            btn.style.borderColor = '#38bdf8';
                        }
                    });
                } else {
                    this.mode = type;
                    document.querySelectorAll('.critical-action-btn').forEach(btn => {
                        const isPreg = btn.querySelector('h3').innerText.toLowerCase() === 'pregnancy';
                        if ((type === 'pregnancy' && isPreg) || (type === 'medical' && !isPreg)) {
                            btn.style.background = type === 'pregnancy' ? '#fff1f2' : '#f0f9ff';
                            btn.style.borderColor = type === 'pregnancy' ? '#e11d48' : '#0369a1';
                        } else {
                            btn.style.background = 'white';
                            btn.style.borderColor = isPreg ? '#fb7185' : '#38bdf8';
                        }
                    });
                    this.toast(`${type.toUpperCase()} SELECTED`, '✅');
                }
            },

            updateStatusUI(stage, message, icon) {
                const ticker = document.getElementById('sosStatusTicker');
                if (ticker) ticker.style.display = 'block';
                const label = document.getElementById('tickerLabel');
                if (label) label.innerText = stage;
                const sub = document.getElementById('tickerSub');
                if (sub) sub.innerText = message;
                const iconEl = document.getElementById('tickerIcon');
                if (iconEl) iconEl.innerText = icon || '📡';
            },

            showScreen(id) {
                document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
                document.getElementById(id).classList.add('active');
                
                // Show/Hide Header
                const header = document.getElementById('appHeader');
                if (id === 'screenLogin') {
                    header.style.display = 'none';
                } else {
                    header.style.display = 'flex';
                }
            },

            nav(tab) {
                const lastSOSTime = parseInt(localStorage.getItem('lastSOSTime') || '0');
                const dynamicLockedUntil = lastSOSTime > 0 ? lastSOSTime + ((this.sosBufferMinutes || 15) * 60 * 1000) : 0;
                let staticLockedUntil = parseInt(localStorage.getItem('sosLockedUntil') || '0');
                if (staticLockedUntil > dynamicLockedUntil && dynamicLockedUntil > 0) {
                    staticLockedUntil = dynamicLockedUntil;
                    localStorage.setItem('sosLockedUntil', staticLockedUntil.toString());
                }
                const lockedUntil = Math.max(dynamicLockedUntil, staticLockedUntil);
                const isLocked = lockedUntil > Date.now();

                if (isLocked && (tab === 'Home' || tab === 'SOS' || tab === 'Form')) {
                    this.toast('SOS LOCKED: Cooldown active.', '⏳');
                    tab = 'Status';
                }

                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                if (tab === 'Home') this.showScreen('screenEmergencyType');
                else if (tab === 'SOS') this.showScreen('screenEmergencyType'); // Redirect SOS to selection
                else if (tab === 'Form') this.showScreen('screenForm');
                else if (tab === 'Status') {
                    this.showScreen('screenStatus');
                    this.fetchStatus();
                }
                else if (tab === 'Settings') this.showScreen('screenSettings');

                const highlightText = tab === 'Status' ? 'HISTORY' : tab;
                const activeLink = Array.from(document.querySelectorAll('.nav-link')).find(l => l.innerText.includes(highlightText));
                if (activeLink) activeLink.classList.add('active');
            },

            historyFilter: 'all',
            rawData: { myHistory: [] },

            async fetchStatus() {
                try {
                    const res = await fetch(`${this.API}/public/status/${this.user.phone}`);
                    const data = await res.json();
                    this.rawData = data; 
                    this.renderStatusUI();
                } catch (e) { console.error(e); }
            },

            renderStatusUI() {
                const search = document.getElementById('statusSearch').value.toLowerCase();
                const listOngoing = document.getElementById('ongoingList');
                const listDone = document.getElementById('completedList');
                
                listOngoing.innerHTML = '';
                listDone.innerHTML = '';

                // Render Ongoing (Live)
                const activeItems = this.rawData.myActive.filter(i => 
                    i.type.toLowerCase().includes(search) || i.sector.toLowerCase().includes(search)
                );
                
                if (!activeItems.length) {
                    listOngoing.innerHTML = '<div style="text-align:center; padding:15px; color:#cbd5e1; font-size:11px; border:1px dashed #e2e8f0; border-radius:12px;">No active missions currently</div>';
                }

                activeItems.forEach(item => {
                    listOngoing.innerHTML += `
                        <div class="hist-item" style="border-left: 4px solid var(--danger); padding:12px;">
                            <div class="hist-details">
                                <h4 style="font-size:13px;">${item.type.toUpperCase()} RESCUE</h4>
                                <p style="font-size:10px;">📍 ${item.sector}</p>
                            </div>
                            <div class="status-badge status-active" style="padding:2px 8px; font-size:9px;">LIVE</div>
                        </div>
                    `;
                });

                // Filter & Render Completed
                let historyItems = this.rawData.myHistory.filter(i => 
                    i.type.toLowerCase().includes(search) || i.sector.toLowerCase().includes(search) || String(i.id).includes(search)
                );

                const now = new Date();
                if (this.historyFilter === 'today') {
                    historyItems = historyItems.filter(i => new Date(i.updated_at).toDateString() === now.toDateString());
                } else if (this.historyFilter === 'weekly') {
                    historyItems = historyItems.filter(i => new Date(i.updated_at) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
                } else if (this.historyFilter === 'yearly') {
                    historyItems = historyItems.filter(i => new Date(i.updated_at) >= new Date(now.getFullYear(), 0, 1));
                }

                if (!historyItems.length) {
                    listDone.innerHTML = '<div style="text-align:center; padding:15px; color:#cbd5e1; font-size:11px;">No completed records found</div>';
                }

                historyItems.forEach(item => {
                    listDone.innerHTML += `
                        <div class="hist-item" style="padding:12px;">
                            <div class="hist-details">
                                <h4 style="font-size:13px;">${item.type.toUpperCase()} • TID #${item.id}</h4>
                                <p style="font-size:10px;">📍 ${item.sector}</p>
                                <p style="margin-top:2px; font-size:9px; color:#94a3b8;">${formatLocalDate(item.updated_at)}</p>
                            </div>
                            <div class="status-badge status-completed" style="padding:2px 8px; font-size:9px;">${item.status}</div>
                        </div>
                    `;
                });
            },

            setHistoryFilter(filter, btn) {
                this.historyFilter = filter;
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderStatusUI();
                this.toast(`ARCHIVE FILTER: ${filter.toUpperCase()}`, '🔍');
            },

            downloadPDF() {
                this.toast('GENERATING MISSION REPORT...', '📄');
                setTimeout(() => {
                    const printWindow = window.open('', '_blank');
                    let historyHtml = '';
                    this.rawData.myHistory.forEach(h => {
                        historyHtml += `
                            <div style="padding:15px; border-bottom:1px solid #eee;">
                                <div style="font-weight:900;">${h.type.toUpperCase()} RESCUE - TID #${h.id}</div>
                                <div style="font-size:12px; color:#666;">Date: ${formatLocalDate(h.updated_at)} | Status: ${h.status.toUpperCase()}</div>
                                <div style="font-size:12px; color:#666;">Location: ${h.sector}</div>
                            </div>
                        `;
                    });

                    printWindow.document.write(`
                        <html>
                        <head><title>SOS Mission Report - ${this.user.name}</title></head>
                        <body style="font-family:sans-serif; padding:40px;">
                            <h1 style="color:#0ea5e9;">SOS MISSION REPORT</h1>
                            <hr/>
                            <p><strong>Citizen:</strong> ${this.user.name}</p>
                            <p><strong>Serial:</strong> ${this.user.serial_number || 'PUB-01'}</p>
                            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                            <h2 style="margin-top:40px; border-bottom:2px solid #000;">COMPLETED MISSIONS</h2>
                            ${historyHtml || '<p>No mission history found.</p>'}
                            <div style="margin-top:60px; font-size:10px; text-align:center; color:#999;">
                                This is an automated system report. Verified by SOS Emergency Network.
                            </div>
                        </body>
                        </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                }, 1000);
            },

            setMode(mode, btn) {
                this.mode = mode;
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            },

            updateNeeds(key, val) {
                this.needs[key] = Math.max(0, this.needs[key] + val);
                document.getElementById('n_' + key).value = this.needs[key];
            },

            manualNeeds(key, val) {
                this.needs[key] = Math.max(0, parseInt(val) || 0);
                document.getElementById('n_' + key).value = this.needs[key];
            },

            startSOS(priority = 'normal') {
                document.querySelector('.pulse-ring').style.opacity = '1';
                this.sosTimer = setTimeout(() => {
                    this.triggerSOS(priority);
                }, 2000);
            },

            cancelSOS() {
                document.querySelector('.pulse-ring').style.opacity = '0';
                clearTimeout(this.sosTimer);
            },

            
            toggleAudioRecord() {
                if (this.isRecording) {
                    this.stopAudioRecord();
                } else {
                    this.startAudioRecord();
                }
            },
            async startAudioRecord() {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    this.mediaRecorder = new MediaRecorder(stream);
                    this.audioChunks = [];
                    this.mediaRecorder.ondataavailable = e => {
                        if (e.data.size > 0) this.audioChunks.push(e.data);
                    };
                    this.mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                        this._compressAudio(audioBlob);
                        stream.getTracks().forEach(track => track.stop());
                    };
                    this.mediaRecorder.start();
                    this.isRecording = true;
                    document.getElementById('audioBtn').style.background = '#fee2e2';
                    document.getElementById('audioBtn').style.borderColor = '#ef4444';
                    this.toast('RECORDING AUDIO...', '🎙️');
                } catch (err) {
                    this.toast('Microphone access denied', '❌');
                }
            },
            stopAudioRecord() {
                if (this.mediaRecorder && this.isRecording) {
                    this.mediaRecorder.stop();
                    this.isRecording = false;
                    document.getElementById('audioBtn').style.background = '#dcfce7';
                    document.getElementById('audioBtn').style.borderColor = '#22c55e';
                    document.getElementById('audioLabel').style.display = 'block';
                    document.getElementById('audioLabel').style.color = '#16a34a';
                    document.getElementById('audioLabel').innerText = 'SAVED';
                    this.toast('AUDIO SAVED', '✅');
                }
            },
            _compressAudio(blob) {
                // Read blob as Data URL. For a short webm audio, it usually stays under 200kb if it's less than 15 secs.
                // To keep it simple, we just convert to Base64 directly since the recording is short.
                const reader = new FileReader();
                reader.onloadend = () => {
                    let base64data = reader.result;
                    // If it's too large, we could truncate or alert, but usually voice notes are small.
                    if (base64data.length > 200 * 1024) {
                        this.toast('Audio too long, will be truncated', '⚠️');
                        base64data = base64data.substring(0, 200 * 1024);
                    }
                    this.needs.audio = base64data;
                };
                reader.readAsDataURL(blob);
            },

            _compressImage(file, maxW, maxH, maxBytes, callback) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        let width = img.width;
                        let height = img.height;
                        if (width > maxW || height > maxH) {
                            if (width > height) {
                                height = Math.round((height * maxW) / width);
                                width = maxW;
                            } else {
                                width = Math.round((width * maxH) / height);
                                height = maxH;
                            }
                        }
                        
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        let quality = 0.8;
                        let dataUrl = canvas.toDataURL('image/jpeg', quality);
                        let base64Length = dataUrl.length - 23;
                        let sizeBytes = Math.round(base64Length * 0.75);
                        
                        while (sizeBytes > maxBytes && quality > 0.1) {
                            quality -= 0.1;
                            dataUrl = canvas.toDataURL('image/jpeg', quality);
                            base64Length = dataUrl.length - 23;
                            sizeBytes = Math.round(base64Length * 0.75);
                        }
                        
                        callback(dataUrl);
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            },

            captureNeed(type) {
                if (type === 'photo') {
                    const input = document.getElementById('critFileInput') || document.getElementById('camInput');
                    if (input) input.click();
                }
            },

            sosImageData: null,
            isRecording: false,
            mediaRecorder: null,
            audioChunks: [],
            handleSOSImage(input) {
                if (input.files && input.files[0]) {
                    this._compressImage(input.files[0], 1024, 1024, 200 * 1024, (compressedDataUrl) => {
                        this.sosImageData = compressedDataUrl;
                        this.needs.photo = compressedDataUrl; // Sync for both flows
                        
                        const preview = document.getElementById('sosImagePreview');
                        if (preview) {
                            preview.style.backgroundImage = `url(${compressedDataUrl})`;
                            preview.style.display = 'block';
                        }
                        
                        // Update Critical SOS UI
                        const btn = document.getElementById('critPhotoBtn');
                        const label = document.getElementById('critPhotoLabel');
                        if (btn) {
                            btn.style.boxShadow = '0 0 15px rgba(59,130,246,0.4)';
                            btn.style.borderColor = '#2563eb';
                        }
                        if (label) {
                            label.innerText = 'ACTIVE';
                            label.style.color = '#1d4ed8';
                        }
                        
                        this.toast('PHOTO CAPTURED & COMPRESSED', '📸');
                    });
                }
            },
            clearSOSImage() {
                this.sosImageData = null;
                const preview = document.getElementById('sosImagePreview');
                if (preview) preview.style.display = 'none';
                const input = document.getElementById('sosFileInput');
                if (input) input.value = '';
            },

            async triggerSOS(priorityOverride) {
                const priority = priorityOverride || (this.emergencyCategory === 'critical' ? 'critical' : 'normal');
                this.updateStatusUI('TRIGGERED', `${priority.toUpperCase()} SOS initiated`, '🚨');

                // Check for manual overrides from Settings
                const overLat = parseFloat(document.getElementById('overLat')?.value);
                const overLng = parseFloat(document.getElementById('overLng')?.value);
                let finalLat = this.currentLocation.lat;
                let finalLng = this.currentLocation.lng;

                if (!isNaN(overLat) && !isNaN(overLng) && (overLat !== 13.085 || overLng !== 80.272)) {
                    finalLat = overLat;
                    finalLng = overLng;
                    console.log("[SOS] Using Manual Coordinate Override:", finalLat, finalLng);
                }

                const customDetails = document.getElementById('inpLoc')?.value.trim() || document.getElementById('crit_address')?.value.trim() || '';

                const payload = {
                    phone: this.user ? this.user.phone : 'Unknown',
                    device_id: this.user ? this.user.serial_number : 'Unknown',
                    type: this.mode,
                    lat: finalLat, 
                    lng: finalLng,
                    details: JSON.stringify({
                        needs: this.needs,
                        route: this.needs.route || 'Not Defined',
                        sector: customDetails,
                        comments: customDetails
                    }),
                    image_data: this.sosImageData || this.needs.photo,
                    urgency: priority === 'critical' ? 'critical' : 'high',
                    sector: customDetails || 'Detected Location',
                    priority: priority
                };

                if (navigator.onLine) {
                    this.updateStatusUI('CONNECTING', 'Syncing with server...', '📡');
                    try {
                        const res = await fetch(`${this.API}/rescue-requests`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        if (res.ok) {
                            const result = await res.json();
                            this.updateStatusUI('DELIVERED', `SOS #${result.id || ''} Delivered Successfully`, '✅');
                            this.updateGlobalNotification('SOS Received', 'Your SOS request received by Server', '📡', 'Received');
                            this.toast('SOS DELIVERED', '✅');
                            
                            const minutes = this.sosBufferMinutes || 15;
                            localStorage.setItem('lastSOSTime', Date.now().toString());
                            this.updateBufferCooldown();

                            this.nav('Status');
                        } else if (res.status === 429) {
                            const errData = await res.json();
                            this.updateStatusUI('BLOCKED', errData.error || 'SOS blocked by buffer time limit.', '⏳');
                            this.toast(errData.error || 'You cannot submit an SOS at this time due to buffer restrictions.', '⏳', 2000);
                            
                            localStorage.setItem('sosLockedUntil', (Date.now() + (this.sosBufferMinutes || 15) * 60 * 1000).toString());
                            localStorage.setItem('lastSOSTime', Date.now().toString());
                            this.updateBufferCooldown();

                            this.nav('Status');
                            return;
                        } else throw new Error('Server reject');
                    } catch (e) {
                        console.error("[SOS] Submit Error:", e);
                        this.queueForRetry(payload);
                    }
                } else {
                    this.queueForRetry(payload);
                }
            },

            queueForRetry(payload) {
                this.updateStatusUI('OFFLINE', 'Waiting for network...', '⏳');
                const queue = JSON.parse(localStorage.getItem('sos_retry_queue') || '[]');
                queue.push({ payload, retries: 0, timestamp: Date.now() });
                localStorage.setItem('sos_retry_queue', JSON.stringify(queue));
                this.toast('OFFLINE: SOS queued for retry', '⏳');
            },

            async processRetryQueue() {
                const queue = JSON.parse(localStorage.getItem('sos_retry_queue') || '[]');
                if (queue.length === 0) {
                    setTimeout(() => this.processRetryQueue(), 5000);
                    return;
                }

                if (navigator.onLine) {
                    const item = queue[0];
                    const waitTime = this.backoff[Math.min(item.retries, this.backoff.length - 1)];

                    setTimeout(async () => {
                        try {
                            const res = await fetch(`${this.API}/rescue-requests`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(item.payload)
                            });
                            if (res.ok) {
                                queue.shift();
                                localStorage.setItem('sos_retry_queue', JSON.stringify(queue));
                                this.updateStatusUI('DELIVERED', 'Sync Complete: SOS Delivered', '✅');
                                this.toast('SYNCED: SOS DELIVERED', '✅');
                            } else if (res.status === 429) {
                                queue.shift();
                                localStorage.setItem('sos_retry_queue', JSON.stringify(queue));
                                const errData = await res.json();
                                this.updateStatusUI('BLOCKED', 'Queued SOS dropped: Buffer active.', '⏳');
                                this.toast('A queued SOS was dropped: ' + (errData.error || 'Buffer limit reached.'), '⏳', 2000);
                            } else {
                                item.retries++;
                                localStorage.setItem('sos_retry_queue', JSON.stringify(queue));
                            }
                        } catch (e) {
                            item.retries++;
                            localStorage.setItem('sos_retry_queue', JSON.stringify(queue));
                        }
                        this.processRetryQueue();
                    }, waitTime);
                } else {
                    setTimeout(() => this.processRetryQueue(), 5000);
                }
            },

            async submitRequest() {
                await this.triggerSOS();
            },

            async refreshStatus() {
                try {
                    const res = await fetch(`${this.API}/rescue-requests/by-phone/${this.user.phone || this.user.serial_number}`);
                    let data = await res.json();
                    data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    this.renderStatus(data);
                } catch (e) { }
            },

            renderStatus(items) {
                const list = document.getElementById('statusList');
                if (items.length === 0) return;

                list.innerHTML = '';
                items.forEach(it => {
                    const card = document.createElement('div');
                    card.className = 'config-card';
                    card.style.marginBottom = '16px';
                    const colors = { pending: 'var(--warning)', accepted: 'var(--primary)', completed: 'var(--secondary)' };
                    let commentHtml = '';
                    if (it.details) {
                        try {
                            const d = typeof it.details === 'string' ? JSON.parse(it.details) : it.details;
                            if (d.comments) {
                                commentHtml = `<p style="font-size:11px; color:var(--text-main); font-style:italic; margin-top:6px; border-left: 2px solid var(--primary); padding-left: 6px;">"${d.comments}"</p>`;
                            }
                        } catch(e) {
                            if (it.details.length > 0) commentHtml = `<p style="font-size:11px; color:var(--text-main); font-style:italic; margin-top:6px; border-left: 2px solid var(--primary); padding-left: 6px;">"${it.details}"</p>`;
                        }
                    }
                    
                    let evidenceHtml = '';
                    if (it.image_url) {
                        evidenceHtml = `<div style="margin-top:8px; width:100%; height:100px; border-radius:8px; overflow:hidden; border:1px solid var(--border);">
                            <img src="http://${window.location.hostname}:3001${it.image_url}" style="width:100%; height:100%; object-fit:cover;">
                        </div>`;
                    }

                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="font-weight:900; font-size:16px;">${it.type.toUpperCase()} RESCUE</span>
                            <span style="font-size:11px; font-weight:900; background:${colors[it.status] || '#ccc'}; color:white; padding:4px 10px; border-radius:8px; text-transform:uppercase;">${it.status}</span>
                        </div>
                        <p style="font-size:13px; color:var(--text-muted); font-weight:600;">Sector: ${it.sector || 'Coordinate'}</p>
                        <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">Request ID: #REQ-${it.id} • ${formatLocalTime(it.created_at)}</p>
                        ${commentHtml}
                        ${evidenceHtml}
                    `;
                    list.appendChild(card);
                });
            },

            toast(msg, icon = '⚠️', duration = 3500) {
                const t = document.getElementById('toast');
                document.getElementById('toastMsg').innerText = msg;
                document.getElementById('toastIcon').innerText = icon;
                t.style.display = 'flex';
                setTimeout(() => t.style.display = 'none', duration);
            },

            showLoader(val) { document.getElementById('loader').style.display = val ? 'flex' : 'none'; },

            setupKeyboardHandling() {
                // Scroll active elements into view on focus
                window.addEventListener('focusin', (e) => {
                    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                        setTimeout(() => {
                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 300);
                    }
                });

                // Adjust mockup height for Visual Viewport (handles mobile keyboard overlap)
                if (window.visualViewport) {
                    window.visualViewport.addEventListener('resize', () => {
                        const mockup = document.querySelector('.phone-mockup');
                        if (window.innerWidth <= 450) {
                            mockup.style.height = `${window.visualViewport.height}px`;
                        } else {
                            mockup.style.height = '100dvh';
                        }
                    });
                }
            },

            openCamera() {
                document.getElementById('camInput').click();
            },

            handlePhoto(input) {
                if (input.files && input.files[0]) {
                    this._compressImage(input.files[0], 1024, 1024, 200 * 1024, (compressedDataUrl) => {
                        this.needs.photo = compressedDataUrl;
                        document.getElementById('capturedImg').src = compressedDataUrl;
                        document.getElementById('photoPreview').style.display = 'block';
                        this.toast('PHOTO ATTACHED & COMPRESSED', '📸');
                    });
                }
            },

            removePhoto() {
                this.needs.photo = null;
                document.getElementById('camInput').value = '';
                document.getElementById('photoPreview').style.display = 'none';
                this.toast('PHOTO REMOVED', '🗑️');
            },

            setRoute(route, btn) {
                if (this.needs.route === route) {
                    this.needs.route = null;
                    btn.classList.remove('active');
                    this.toast('ROUTE DESELECTED', '📍');
                } else {
                    this.needs.route = route;
                    document.querySelectorAll('.route-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.toast(`PREFERRING ${route.toUpperCase()}`, '🚀');
                }
            },

            bootstrap() {
                document.getElementById('dispName').innerText = this.user.name;
                document.getElementById('profName').innerText = this.user.name;
                document.getElementById('profId').innerText = `ID: ${this.user.serial_number || 'PUB-01'}`;
                
                window.addEventListener('online', () => this.updateNetUI(true));
                window.addEventListener('offline', () => this.updateNetUI(false));
                this.updateNetUI(navigator.onLine);
            },

            updateNetUI(online) {
                const dot = document.getElementById('syncStatusDot');
                const label = document.getElementById('dispSyncInterval');
                if (dot) {
                    dot.style.background = online ? 'var(--secondary)' : 'var(--danger)';
                    dot.style.boxShadow = online ? '0 0 10px var(--secondary)' : '0 0 10px var(--danger)';
                }
                if (!online && label) {
                    label.innerText = `RECONNECTING: ${this.refreshInterval}s`;
                    label.style.color = 'var(--danger)';
                } else if (label) {
                    label.innerText = `${this.refreshInterval}s (Admin Set)`;
                    label.style.color = 'var(--primary)';
                }
            }
        };

        window.core = core;
        window.onload = () => core.init();
    
