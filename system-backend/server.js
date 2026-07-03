const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const os = require('os');

const { runSystemBackup } = require('./backup_util');
const triggerBackup = () => {
    setTimeout(() => {
        try {
            runSystemBackup(path.join(__dirname, 'rescue.db'));
        } catch (e) {
            console.error('[Backup Error]:', e);
        }
    }, 800);
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve root directory files (previews) for easy local testing
app.get('/', (req, res) => res.redirect('/Web%20ADMIN.html'));
app.use('/', express.static(path.join(__dirname, '..')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const JWT_SECRET = 'rescue_secret_key_2026';

// ─── Database Setup ──────────────────────────────────────────────────────────
const db = new sqlite3.Database(path.join(__dirname, 'rescue.db'), (err) => {
    if (err) {
        console.error('DB Error:', err);
    } else {
        console.log('Connected to SQLite DB');
        db.serialize(() => {
            db.run('PRAGMA journal_mode=WAL;', (err) => {
                if (err) console.error('[DB WAL PRAGMA Error]:', err);
                else console.log('[DB Config] SQLite Write-Ahead Logging (WAL) enabled.');
            });
            db.run('PRAGMA synchronous=NORMAL;', (err) => {
                if (err) console.error('[DB Sync PRAGMA Error]:', err);
            });
        });
    }
});

const run = (sql, params = []) => new Promise((res, rej) =>
    db.run(sql, params, function (err) { err ? rej(err) : res(this); }));
const get = (sql, params = []) => new Promise((res, rej) =>
    db.get(sql, params, (err, row) => err ? rej(err) : res(row)));
const all = (sql, params = []) => new Promise((res, rej) =>
    db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)));

// ─── Test Endpoints (For Connectivity Verification) ────────────────────────
app.get('/api/test', (req, res) => res.json({ status: 'Connected to API' }));
app.get('/api/auth/test', (req, res) => res.json({ status: 'Connected to Auth API' }));

// ─── Operations Management ────────────────────────────────────────────────────
app.get('/api/operations', async (req, res) => {
    try {
        const rows = await all(`SELECT * FROM operation_history ORDER BY created_at DESC`);
        const formatted = rows.map(r => ({
            ...r,
            zoneData: JSON.parse(r.zone_data)
        }));
        res.json(formatted);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/operations', async (req, res) => {
    const { id, name, date, zoneData } = req.body;
    try {
        await run(`INSERT INTO operation_history (id, name, date, zone_data) VALUES (?, ?, ?, ?)`,
            [id, name, date, JSON.stringify(zoneData)]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/operations/:id', async (req, res) => {
    try {
        await run(`DELETE FROM operation_history WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/operations/:id', async (req, res) => {
    const { name, zoneData } = req.body;
    try {
        await run(`UPDATE operation_history SET name = ?, zone_data = ? WHERE id = ?`,
            [name, JSON.stringify(zoneData), req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/messages/send', async (req, res) => {
    const { deviceId, message } = req.body;
    if (!deviceId || !message) return res.status(400).json({ error: 'Missing data' });
    
    // 1. Send via WebSocket (for live web clients)
    const sent = socketManager.send(deviceId, 'ADMIN_MESSAGE', { message, timestamp: new Date().toISOString() });
    
    // 2. Insert into notifications table (for native apps polling via /api/sync)
    try {
        await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
            [deviceId, 'admin_message', message, 0]);
    } catch (e) {
        console.error("Failed to insert message notification:", e);
    }
    
    res.json({ success: true, queued: !sent });
});


db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS operation_zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone_geometry TEXT,
        operation_type TEXT,
        operation_type_id INTEGER,
        assigned_group_id INTEGER,
        zone_name TEXT DEFAULT 'Zone',
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active',
        radius REAL,
        radius_unit TEXT DEFAULT 'KM'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS rescuer_task_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        rescuer_id INTEGER,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, rescuer_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS rescuer_command_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command_id INTEGER,
        rescuer_id INTEGER,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(command_id, rescuer_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_name TEXT UNIQUE,
        member_count INTEGER DEFAULT 0,
        role_type TEXT,
        description TEXT,
        zone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`ALTER TABLE groups ADD COLUMN zone TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE groups ADD COLUMN member_count INTEGER DEFAULT 0`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE groups ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => { /* ignore */ });

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'rescuer',
        phone TEXT UNIQUE,
        device_id TEXT,
        serial_number TEXT,
        photo_url TEXT,
        password TEXT,
        status TEXT DEFAULT 'active',
        last_seen DATETIME,
        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        interrupted_task_id TEXT
    )`);
    db.run(`ALTER TABLE users ADD COLUMN password TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE users ADD COLUMN serial_number TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE rescue_requests ADD COLUMN assigned_phone TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE rescue_requests ADD COLUMN phone TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE rescue_requests ADD COLUMN completion_image_url TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE command_queue ADD COLUMN completion_image_url TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE groups ADD COLUMN ai_managed INTEGER DEFAULT 0`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE users ADD COLUMN ai_managed INTEGER DEFAULT 0`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE users ADD COLUMN is_online INTEGER DEFAULT 0`, (err) => { /* ignore */ });
    db.run(`UPDATE users SET status = 'offline', is_online = 0 WHERE role != 'public'`);

    // Backfill serial numbers for existing users
    db.all("SELECT id, role FROM users WHERE serial_number IS NULL", [], (err, rows) => {
        if (rows) {
            rows.forEach((row, idx) => {
                const prefix = row.role === 'public' ? 'PUB' : 'MEM';
                const sn = `${prefix}-${String(idx + 1).padStart(2, '0')}`;
                db.run("UPDATE users SET serial_number = ? WHERE id = ?", [sn, row.id]);
            });
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS operation_history (
        id TEXT PRIMARY KEY,
        name TEXT,
        date TEXT,
        zone_data TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        group_id INTEGER,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, group_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS command_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER,
        target_phone TEXT,
        operation_zone_id INTEGER,
        command_payload TEXT,
        command_type TEXT DEFAULT 'zone',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at DATETIME
    )`);
    db.run(`ALTER TABLE command_queue ADD COLUMN target_phone TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE command_queue ADD COLUMN command_type TEXT DEFAULT 'zone'`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE command_queue ADD COLUMN priority TEXT DEFAULT 'normal'`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE command_queue ADD COLUMN updated_at DATETIME`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE command_queue ADD COLUMN assigned_by VARCHAR(20) DEFAULT 'Admin'`, (err) => { /* ignore */ });


    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sos_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT,
        phone TEXT,
        lat REAL,
        lng REAL,
        details TEXT,
        status TEXT DEFAULT 'active',
        is_priority INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS rescuer_locations (
        device_id TEXT PRIMARY KEY,
        group_id INTEGER,
        name TEXT,
        lat REAL,
        lng REAL,
        status TEXT DEFAULT 'active',
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);



    db.run(`CREATE TABLE IF NOT EXISTS operation_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#3b82f6',
        icon TEXT DEFAULT '🛡️',
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS map_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT,
        center_lat REAL,
        center_lng REAL,
        radius_km REAL,
        state TEXT,
        district TEXT,
        tile_count INTEGER DEFAULT 0,
        size_mb REAL DEFAULT 0,
        downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS command_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT,
        actor TEXT DEFAULT 'Commander',
        target TEXT,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT,
        type TEXT,
        message TEXT,
        action_required INTEGER DEFAULT 0,
        action_taken TEXT,
        read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS rescue_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT,
        phone TEXT,
        type TEXT DEFAULT 'pregnancy',
        lat REAL,
        lng REAL,
        details TEXT,
        status TEXT DEFAULT 'pending',
        urgency TEXT DEFAULT 'high',
        priority TEXT DEFAULT 'normal',
        sector TEXT,
        assigned_user_id INTEGER,
        assigned_group_id INTEGER,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`ALTER TABLE rescue_requests ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE rescue_requests ADD COLUMN priority TEXT DEFAULT 'normal'`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE rescue_requests ADD COLUMN name TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE rescue_requests ADD COLUMN image_url TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE rescue_requests ADD COLUMN audio_url TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE rescue_requests ADD COLUMN assignment_version INTEGER DEFAULT 0`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE rescue_requests ADD COLUMN assignment_timestamp DATETIME`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE command_queue ADD COLUMN assignment_version INTEGER DEFAULT 0`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE command_queue ADD COLUMN assignment_timestamp DATETIME`, (err) => { /* ignore */ });

    // Mission Lifecycle & Audit Tables
    db.run(`CREATE TABLE IF NOT EXISTS sos_assignment_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rescue_req_id INTEGER,
        rescuer_id INTEGER,
        action TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS sos_completion_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rescue_req_id INTEGER,
        completed_by_rescuer_id INTEGER,
        evidence_url TEXT,
        completion_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS operation_history (
        id TEXT PRIMARY KEY,
        name TEXT,
        date TEXT,
        status TEXT DEFAULT 'Active',
        zone_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Default settings
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('sos_interval', '15')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('sos_interval_unit', 'minutes')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_assignment_buffer_seconds', '15')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('sharing_protocol', 'auto')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('refresh_interval', '5')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('normal_task_grouping_radius', '2')`);
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('normal_task_grouping_unit', 'KM')`);

    // Default operation types
    db.run(`INSERT OR IGNORE INTO operation_types (name, color, icon) VALUES ('Rescue', '#3b82f6', '🛡️')`);
    db.run(`INSERT OR IGNORE INTO operation_types (name, color, icon) VALUES ('Medical', '#10b981', '🏥')`);
    db.run(`INSERT OR IGNORE INTO operation_types (name, color, icon) VALUES ('Food Supply', '#f59e0b', '🍱')`);
    db.run(`INSERT OR IGNORE INTO operation_types (name, color, icon) VALUES ('Evacuation', '#ef4444', '🚨')`);

    // Default groups
    db.get("SELECT COUNT(*) as count FROM groups", [], (err, row) => {
        if (row && row.count === 0) {
            db.run(`INSERT INTO groups (group_name, member_count, role_type) VALUES ('Group Alpha', 12, 'rescue')`);
            db.run(`INSERT INTO groups (group_name, member_count, role_type) VALUES ('Group Bravo', 5, 'food')`);
            db.run(`INSERT INTO groups (group_name, member_count, role_type) VALUES ('Group Charlie', 8, 'medical')`);
        }
    });

    // Default users
    db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
        if (row && row.count === 0) {
            // Dummy users removed
        }
    });

    // Default rescue requests
    db.get("SELECT COUNT(*) as count FROM rescue_requests", [], (err, row) => {
        if (row && row.count === 0) {
            // Dummy rescue requests removed
        }
    });

    // Production database indexing for high concurrency queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_rescue_requests_status ON rescue_requests(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_rescue_requests_phone ON rescue_requests(phone)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_command_queue_status ON command_queue(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_rescuer_locations_group ON rescuer_locations(group_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_device_read ON notifications(device_id, read)`);
});

// ─── Real-Time Gateway (Enhanced WebSocket) ──────────────────────────────────
const clients = new Map(); // Map<deviceId, ws>
const rooms = new Map(); // Map<roomName, Set<deviceId>>
const pendingMessages = new Map(); // Map<deviceId, Array<{type, data, timestamp, retryCount}>>

const socketManager = {
    addClient(deviceId, ws) {
        clients.set(deviceId, ws);
        console.log(`[GATEWAY] Device connected: ${deviceId}`);

        // Push pending messages
        if (pendingMessages.has(deviceId)) {
            const messages = pendingMessages.get(deviceId);
            console.log(`[GATEWAY] Pushing ${messages.length} pending messages to ${deviceId}`);
            messages.forEach(msg => this.send(deviceId, msg.type, msg.data, false));
            pendingMessages.delete(deviceId);
        }
    },

    removeClient(deviceId) {
        clients.delete(deviceId);
        console.log(`[GATEWAY] Device disconnected: ${deviceId}`);
    },

    joinRoom(deviceId, room) {
        if (!rooms.has(room)) rooms.set(room, new Set());
        rooms.get(room).add(deviceId);
    },

    send(deviceId, type, data, queueIfOffline = true) {
        const ws = clients.get(deviceId);
        const payload = JSON.stringify({ type, data, timestamp: new Date().toISOString(), deliveryId: Math.random().toString(36).substr(2, 9) });

        if (ws && ws.readyState === 1) {
            ws.send(payload);
            return true;
        } else if (queueIfOffline) {
            if (!pendingMessages.has(deviceId)) pendingMessages.set(deviceId, []);
            pendingMessages.get(deviceId).push({ type, data, timestamp: new Date().toISOString() });
            return false;
        }
        return false;
    },

    broadcast(type, data, room = null) {
        const targets = room ? (rooms.get(room) || []) : clients.keys();
        for (const deviceId of targets) {
            this.send(deviceId, type, data);
        }
    }
};

wss.on('connection', (ws) => {
    let currentDeviceId = null;
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (message) => {
        try {
            const { type, deviceId, room, data, deliveryId } = JSON.parse(message);

            if (type === 'REGISTER') {
                currentDeviceId = deviceId;
                ws.deviceId = deviceId;
                socketManager.addClient(deviceId, ws);
                if (room) socketManager.joinRoom(deviceId, room);
                ws.send(JSON.stringify({ type: 'REGISTERED', status: 'ready', serverTime: new Date().toISOString() }));
                
                // Update online status in database
                run(`UPDATE users SET status = 'online', is_online = 1, is_available = 1, last_seen = CURRENT_TIMESTAMP WHERE device_id = ? OR phone = ?`, [deviceId, deviceId])
                    .then(() => socketManager.broadcast('RESCUER_STATUS_CHANGE', { deviceId, status: 'online' }, 'admin'))
                    .catch(e => console.error('Status Update Error:', e));
            }

            if (type === 'ACK') {
                console.log(`[GATEWAY] Acknowledgement received for message ${deliveryId} from ${deviceId}`);
            }

            if (type === 'HEARTBEAT' || type === 'PING') {
                ws.isAlive = true;
                ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
            }

            if (type === 'TASK_SYNC') {
                // Client reconnect state sync verification
                const { task_id, current_assigned_rescuer_id, assignment_version } = data;
                if (task_id) {
                    const reqObj = await get(`SELECT assigned_user_id, assignment_version, status FROM rescue_requests WHERE id = ?`, [task_id]);
                    const rescuer = await get(`SELECT id FROM users WHERE device_id = ? OR phone = ?`, [deviceId, deviceId]);
                    if (reqObj && rescuer) {
                        const isAssigned = (reqObj.assigned_user_id === rescuer.id && reqObj.status === 'assigned');
                        const versionMatches = (reqObj.assignment_version === assignment_version);
                        if (!isAssigned || !versionMatches) {
                            console.log(`[Sync] Stale task detected during sync for task #${task_id} on rescuer ID ${rescuer.id}. Issuing TASK_REVOKED.`);
                            ws.send(JSON.stringify({
                                type: 'TASK_REVOKED',
                                data: {
                                    task_id: task_id,
                                    old_rescuer_id: rescuer.id,
                                    new_assignment_version: reqObj.assignment_version
                                }
                            }));
                        }
                    }
                }
            }

            if (type === 'RESCUER_LOCATION') {
                // Update live tracking
                const { lat, lng, name, group_id } = data;
                await run(`INSERT OR REPLACE INTO rescuer_locations (device_id, group_id, name, lat, lng, last_updated) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [deviceId, group_id, name, lat, lng]);
                socketManager.broadcast('LIVE_LOCATION_UPDATE', { deviceId, name, lat, lng, group_id });
            }

            if (type === 'LIVE_LOCATION_UPDATE') {
                const parsedMsg = JSON.parse(message);
                await run(`INSERT OR REPLACE INTO rescuer_locations (device_id, group_id, name, lat, lng, last_updated) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [deviceId, 1, parsedMsg.name || 'Rescuer', parsedMsg.lat, parsedMsg.lng]);
                socketManager.broadcast('LIVE_LOCATION_UPDATE', parsedMsg);
            }
        } catch (e) { console.error('WS Message Error:', e); }
    });

    ws.on('close', () => {
        if (currentDeviceId) {
            socketManager.removeClient(currentDeviceId);
            run(`UPDATE users SET status = 'offline', is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE device_id = ? OR phone = ?`, [currentDeviceId, currentDeviceId])
                .then(() => socketManager.broadcast('RESCUER_STATUS_CHANGE', { deviceId: currentDeviceId, status: 'offline' }, 'admin'))
                .catch(e => console.error('Status Update Error:', e));
        }
    });
});

const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            if (ws.deviceId) {
                run(`UPDATE users SET status = 'offline', is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE device_id = ? OR phone = ?`, [ws.deviceId, ws.deviceId])
                    .then(() => socketManager.broadcast('RESCUER_STATUS_CHANGE', { deviceId: ws.deviceId, status: 'offline' }, 'admin'))
                    .catch(e => console.error('Status Update Error:', e));
                socketManager.removeClient(ws.deviceId);
            }
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});

const broadcast = (type, data, room = null) => socketManager.broadcast(type, data, room);

const broadcastToAdminAndTarget = async (type, data, targetUserIdOrDeviceId = null) => {
    // 1. Always broadcast to the Admin dashboard room
    broadcast(type, data, 'admin');
    
    // 2. Safely target the specific rescuer if provided
    if (targetUserIdOrDeviceId) {
        const user = await get('SELECT device_id, phone FROM users WHERE id = ? OR phone = ? OR device_id = ?', 
            [targetUserIdOrDeviceId, targetUserIdOrDeviceId, targetUserIdOrDeviceId]);
        if (user && user.device_id) {
            socketManager.send(user.device_id, type, data);
        }
        if (user && user.phone) {
            socketManager.send(user.phone, type, data);
        }
        socketManager.send(targetUserIdOrDeviceId, type, data);
    }
};

const logCommand = async (action, actor, target, details) => {
    try {
        await run(`INSERT INTO command_log (action, actor, target, details) VALUES (?, ?, ?, ?)`,
            [action, actor, target, JSON.stringify(details)]);
        broadcast('COMMAND_LOG', { action, actor, target, details, timestamp: new Date().toISOString() });
    } catch (e) { console.error('Log error:', e); }
};

function saveCompletionImage(image_data) {
    if (!image_data) return null;
    try {
        const matches = image_data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/s);
        let extension = 'jpg';
        let base64Data = '';

        if (matches && matches.length === 3) {
            extension = matches[1].toLowerCase();
            base64Data = matches[2];
        } else if (image_data.includes('base64,')) {
            const parts = image_data.split('base64,');
            base64Data = parts[1];
            if (parts[0].includes('png')) extension = 'png';
        } else {
            base64Data = image_data;
        }

        if (base64Data) {
            base64Data = base64Data.replace(/\s+/g, '');
            const fileName = `comp_task_${Date.now()}.${extension === 'png' ? 'png' : 'jpg'}`;
            const uploadsDir = path.join(__dirname, 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const uploadPath = path.join(uploadsDir, fileName);
            fs.writeFileSync(uploadPath, base64Data, 'base64');
            return `/uploads/${fileName}`;
        }
    } catch (err) {
        console.error('Completion image upload error:', err);
    }
    return null;
}


const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const groupTasks = async () => {
    const radiusSetting = await get(`SELECT value FROM settings WHERE key = 'normal_task_grouping_radius'`);
    const unitSetting = await get(`SELECT value FROM settings WHERE key = 'normal_task_grouping_unit'`);
    const radius = parseFloat(radiusSetting.value);
    const radiusInKm = unitSetting.value === 'MTR' ? radius / 1000 : radius;

    // Get all pending normal tasks
    const normalTypes = ['food', 'medical supply', 'other supply', 'supply'];
    const tasks = await all(`SELECT * FROM rescue_requests WHERE status = 'pending'`);
    const normalTasks = tasks.filter(t => normalTypes.some(type => t.type.toLowerCase().includes(type)));

    // Deactivate old zones for normal tasks
    await run(`UPDATE operation_zones SET status = 'inactive' WHERE zone_name LIKE 'Grouped Task Zone%'`);

    const groups = [];
    normalTasks.forEach(task => {
        let addedToGroup = false;
        for (const group of groups) {
            const dist = getDistance(task.lat, task.lng, group.center.lat, group.center.lng);
            if (dist <= radiusInKm) {
                group.tasks.push(task);
                addedToGroup = true;
                break;
            }
        }
        if (!addedToGroup) {
            groups.push({ center: { lat: task.lat, lng: task.lng }, tasks: [task] });
        }
    });

    for (const group of groups) {
        if (group.tasks.length > 0) {
            const zone_geometry = {
                type: 'Circle',
                center: group.center,
                radius: radiusInKm * 1000 // meters for Leaflet
            };
            const zone_name = `Grouped Task Zone (${group.tasks.length} tasks)`;
            const opType = group.tasks[0].type;

            const result = await run(
                `INSERT INTO operation_zones (zone_geometry, operation_type, zone_name, radius, radius_unit) VALUES (?, ?, ?, ?, ?)`,
                [JSON.stringify(zone_geometry), opType, zone_name, radius, unitSetting.value]
            );
            const zoneId = result.lastID;

            for (const task of group.tasks) {
                await run(`UPDATE rescue_requests SET sector = ? WHERE id = ?`, [zone_name, task.id]);
            }
        }
    }
    broadcast('RELOAD_MAP', {});
    await logCommand('TASKS_REGROUPED', 'System', 'All Tasks', { radius, unit: unitSetting.value });
};

// ─── Authentication ──────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    const { idOrPhone, pin, deviceId } = req.body;
    try {
        const cleaned = (idOrPhone || '').replace(/\D/g, '');
        const last10 = cleaned.length >= 10 ? cleaned.slice(-10) : null;
        let user;
        if (last10) {
            user = await get(`SELECT * FROM users WHERE (serial_number = ? OR phone = ? OR (length(REPLACE(phone, '+', '')) >= 10 AND REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ?)) AND password = ? ORDER BY CASE WHEN serial_number = ? THEN 2 WHEN phone = ? THEN 1 ELSE 0 END DESC LIMIT 1`, [idOrPhone, idOrPhone, `%${last10}`, pin, idOrPhone, idOrPhone]);
        } else {
            user = await get(`SELECT * FROM users WHERE (serial_number = ? OR phone = ?) AND password = ? LIMIT 1`, [idOrPhone, idOrPhone, pin]);
        }
        
        if (!user) {
            await logCommand('LOGIN_FAILED', 'System', idOrPhone, { reason: 'Invalid credentials' });
            return res.status(401).json({ error: 'Invalid ID or PIN' });
        }
        
        if (user.status === 'disabled' || user.status === 'inactive') {
            await logCommand('LOGIN_REJECTED', 'System', idOrPhone, { reason: 'Account disabled' });
            return res.status(403).json({ error: 'Account disabled by Administrator' });
        }

        if (deviceId) {
            // Always update device ID to the current one so notifications reach the active session
            await run(`UPDATE users SET device_id = ? WHERE id = ?`, [deviceId, user.id]);
            user.device_id = deviceId;
        }
        
        // Generate JWT token
        const passwordHash = crypto.createHash('sha256').update(user.password || '').digest('hex');
        const token = jwt.sign({ id: user.id, name: user.name, role: user.role, phone: user.phone, serial: user.serial_number, deviceId: user.device_id, passwordHash }, JWT_SECRET, { expiresIn: '7d' });
        
        // Audit log
        await logCommand('LOGIN_SUCCESS', user.name, user.serial_number, { role: user.role, deviceId });
        
        const userGroups = await all(`SELECT g.* FROM group_members gm JOIN groups g ON gm.group_id = g.id WHERE gm.user_id = ?`, [user.id]);
        
        res.json({ token, user: { 
            id: user.id, 
            name: user.name, 
            role: user.role, 
            serial_number: user.serial_number, 
            phone: user.phone, 
            device_id: user.device_id, 
            interrupted_task_id: user.interrupted_task_id,
            groups: userGroups
        } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid or expired token' });
        
        // Check if user is still active in database
        try {
            const user = await get(`SELECT status, password FROM users WHERE id = ?`, [decoded.id]);
            if (!user || user.status === 'disabled' || user.status === 'inactive') {
                return res.status(403).json({ error: 'Account disabled by Administrator' });
            }
            if (decoded.passwordHash) {
                const currentHash = crypto.createHash('sha256').update(user.password || '').digest('hex');
                if (decoded.passwordHash !== currentHash) {
                    return res.status(401).json({ error: 'Password changed. Please log in again.' });
                }
            }
            req.user = decoded;
            next();
        } catch (e) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
};

app.get('/api/auth/verify', verifyToken, async (req, res) => {
    try {
        const user = await get(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userGroups = await all(`SELECT g.* FROM group_members gm JOIN groups g ON gm.group_id = g.id WHERE gm.user_id = ?`, [user.id]);
        res.json({ 
            valid: true, 
            user: { 
                id: user.id, 
                name: user.name, 
                role: user.role, 
                serial_number: user.serial_number, 
                phone: user.phone, 
                device_id: user.device_id, 
                interrupted_task_id: user.interrupted_task_id,
                groups: userGroups
            } 
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/server-ip', (req, res) => {
    try {
        const interfaces = os.networkInterfaces();
        let ip = '127.0.0.1';
        let fallbackIp = null;
        for (const devName in interfaces) {
            const iface = interfaces[devName];
            const isVirtual = devName.toLowerCase().includes('virtual') || devName.toLowerCase().includes('veth') || devName.toLowerCase().includes('wsl');
            for (let i = 0; i < iface.length; i++) {
                const alias = iface[i];
                if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                    if (!isVirtual) {
                        ip = alias.address;
                        break;
                    } else if (!fallbackIp) {
                        fallbackIp = alias.address;
                    }
                }
            }
            if (ip !== '127.0.0.1') break;
        }
        if (ip === '127.0.0.1' && fallbackIp) ip = fallbackIp;
        res.json({ ip });
    } catch(e) {
        res.json({ ip: '127.0.0.1' });
    }
});

// ─── Zones ────────────────────────────────────────────────────────────────────
app.get('/api/zones', async (req, res) => {
    try { res.json(await all(`SELECT oz.*, g.group_name FROM operation_zones oz LEFT JOIN groups g ON oz.assigned_group_id = g.id`)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/zones', async (req, res) => {
    const { zone_geometry, operation_type, operation_type_id, assigned_group_id, created_by, zone_name } = req.body;
    try {
        const result = await run(
            `INSERT INTO operation_zones (zone_geometry, operation_type, operation_type_id, assigned_group_id, created_by, zone_name) VALUES (?, ?, ?, ?, ?, ?)`,
            [JSON.stringify(zone_geometry), operation_type, operation_type_id, assigned_group_id, created_by, zone_name || 'Zone']
        );
        const zoneId = result.lastID;
        const payload = JSON.stringify({ zoneId, zone_geometry, operation_type, zone_name });

        // Create command queue entry
        await run(`INSERT INTO command_queue (group_id, operation_zone_id, command_payload) VALUES (?, ?, ?)`,
            [assigned_group_id, zoneId, payload]);

        // Create notifications for all members of the group
        const members = await all(`SELECT u.device_id, u.name FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?`, [assigned_group_id]);
        for (const m of members) {
            await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                [m.device_id, 'new_task', `Your new task is updated. Zone: ${zone_name || 'Zone'} - ${operation_type}. Please confirm to get into new task.`, 1]);
        }

        broadcast('NEW_ZONE', { id: zoneId, zone_geometry, operation_type, assigned_group_id, zone_name });
        await logCommand('ZONE_CREATED', created_by || 'Commander', `Zone: ${zone_name}`, { operation_type, assigned_group_id });
        res.json({ id: zoneId, message: 'Zone created and assigned' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/zones/:id', async (req, res) => {
    try {
        await run(`UPDATE operation_zones SET status = 'inactive' WHERE id = ?`, [req.params.id]);
        await logCommand('ZONE_DELETED', 'Commander', `Zone ID: ${req.params.id}`, {});
        res.json({ message: 'Zone deactivated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Groups ───────────────────────────────────────────────────────────────────
app.get('/api/groups', async (req, res) => {
    try { res.json(await all(`SELECT g.*, COUNT(gm.id) as actual_count FROM groups g LEFT JOIN group_members gm ON g.id = gm.group_id GROUP BY g.id`)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/groups', async (req, res) => {
    const { group_name, role_type, description, ai_managed } = req.body;
    try {
        const result = await run(`INSERT INTO groups (group_name, role_type, description, ai_managed) VALUES (?, ?, ?, ?)`, [group_name, role_type, description, ai_managed ? 1 : 0]);
        await logCommand('GROUP_CREATED', 'Commander', group_name, { role_type });
        const grp = await get(`SELECT * FROM groups WHERE id = ?`, [result.lastID]);
        broadcast('GROUP_UPDATE', grp);
        res.json(grp);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/groups/:id', async (req, res) => {
    const { group_name, role_type, description, ai_managed } = req.body;
    try {
        await run(`UPDATE groups SET group_name = ?, role_type = ?, description = ?, ai_managed = ? WHERE id = ?`, [group_name, role_type, description, ai_managed ? 1 : 0, req.params.id]);
        const grp = await get(`SELECT * FROM groups WHERE id = ?`, [req.params.id]);
        broadcast('GROUP_UPDATE', grp);
        res.json(grp);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/groups/:id', async (req, res) => {
    try {
        await run(`DELETE FROM groups WHERE id = ?`, [req.params.id]);
        await run(`DELETE FROM group_members WHERE group_id = ?`, [req.params.id]);
        broadcast('GROUP_DELETED', { id: parseInt(req.params.id) });
        res.json({ message: 'Group deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/groups/:id/members', async (req, res) => {
    try { res.json(await all(`SELECT u.* FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?`, [req.params.id])); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/groups/:id/members', async (req, res) => {
    const { user_id } = req.body;
    try {
        await run(`INSERT OR IGNORE INTO group_members (user_id, group_id) VALUES (?, ?)`, [user_id, req.params.id]);
        await run(`UPDATE groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ?) WHERE id = ?`, [req.params.id, req.params.id]);
        const grp = await get(`SELECT * FROM groups WHERE id = ?`, [req.params.id]);
        broadcast('GROUP_UPDATE', grp);
        res.json({ message: 'Member added' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/groups/:id/members/:userId', async (req, res) => {
    try {
        await run(`DELETE FROM group_members WHERE group_id = ? AND user_id = ?`, [req.params.id, req.params.userId]);
        await run(`UPDATE groups SET member_count = (SELECT COUNT(*) FROM group_members WHERE group_id = ?) WHERE id = ?`, [req.params.id, req.params.id]);
        res.json({ message: 'Member removed' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Users ────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
    const { phone, password } = req.body; // 'phone' here is the identifier (could be actual phone or SN)
    try {
        const cleaned = (phone || '').replace(/\D/g, '');
        const last10 = cleaned.length >= 10 ? cleaned.slice(-10) : null;
        let user;
        if (last10) {
            user = await get(`SELECT * FROM users WHERE (serial_number = ? OR phone = ? OR (length(REPLACE(phone, '+', '')) >= 10 AND REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ?)) AND password = ? AND status = 'active' ORDER BY CASE WHEN serial_number = ? THEN 2 WHEN phone = ? THEN 1 ELSE 0 END DESC LIMIT 1`, [phone, phone, `%${last10}`, password, phone, phone]);
        } else {
            user = await get(`SELECT * FROM users WHERE (serial_number = ? OR phone = ?) AND password = ? AND status = 'active' LIMIT 1`, [phone, phone, password]);
        }
        if (user) {
            // Fetch groups for user
            const userGroups = await all(`SELECT g.* FROM group_members gm JOIN groups g ON gm.group_id = g.id WHERE gm.user_id = ?`, [user.id]);
            user.groups = userGroups;
            res.json(user);
        } else {
            res.status(401).json({ error: 'Invalid credentials or inactive account' });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:id/combined-history', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await get(`SELECT * FROM users WHERE id = ?`, [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const groups = await all(`SELECT group_id FROM group_members WHERE user_id = ?`, [userId]);
        const groupIds = groups.map(g => g.group_id);

        // Personal & Group Rescue Requests (include active and resolved tasks)
        let personalReqQuery = `
            SELECT DISTINCT 'request' as source, rr.id, rr.type, rr.sector, rr.status, rr.lat, rr.lng, 
                   rr.created_at, rr.updated_at, rr.image_url, rr.audio_url, rr.completion_image_url, 
                   rr.details, rr.priority, rr.name, rr.phone, rr.assigned_user_id, rr.assigned_group_id
            FROM rescue_requests rr
            LEFT JOIN sos_assignment_history sah ON rr.id = sah.rescue_req_id
            WHERE (rr.assigned_user_id = ? OR sah.rescuer_id = ?)
        `;
        let reqParams = [userId, userId];
        if (groupIds.length > 0) {
            personalReqQuery += ` OR (rr.assigned_group_id IN (${groupIds.map(() => '?').join(',')}))`;
            reqParams = reqParams.concat(groupIds);
        }
        let personalReqs = await all(personalReqQuery, reqParams);

        const userActions = await all(`SELECT rescue_req_id, action FROM sos_assignment_history WHERE rescuer_id = ? ORDER BY created_at DESC`, [userId]);
        const userActionMap = {};
        userActions.forEach(row => {
            if (!userActionMap[row.rescue_req_id]) {
                userActionMap[row.rescue_req_id] = row.action; // Takes the latest action because of ORDER BY DESC
            }
        });

        personalReqs = personalReqs.map(rr => {
            const isAssignedUser = (rr.assigned_user_id == userId);
            const isAssignedGroup = (rr.assigned_group_id && groupIds.includes(rr.assigned_group_id));
            if (!isAssignedUser && !isAssignedGroup) {
                const lastAction = userActionMap[rr.id];
                if (lastAction && ['declined', 'ignored', 'cancelled'].includes(lastAction)) {
                    rr.status = lastAction;
                } else if (lastAction === 'assigned') {
                    rr.status = 'ignored'; // Timed out or reassigned
                } else {
                    rr.status = 'reassigned';
                }
            }
            return rr;
        });

        // Group & Personal Commands — match STRICTLY
        const cleanDeviceId = (user.device_id || '').trim();
        const userPhone = (user.phone || '').trim();

        let params = [];
        let commandQuery = `
            SELECT 'command' as source, cq.id, cq.command_type as type, 'HQ Order' as sector, 
                   cq.status, cq.created_at, cq.updated_at, cq.command_payload, cq.priority, cq.completion_image_url 
            FROM command_queue cq
            WHERE (
                cq.target_phone = ?
                OR (cq.target_phone = ? AND cq.target_phone != '')
                OR cq.target_phone = ?
            )
        `;
        params.push(userPhone, cleanDeviceId, userId.toString());

        if (groupIds.length > 0) {
            commandQuery += ` OR (cq.group_id IN (${groupIds.map(() => '?').join(',')}))`;
            params = params.concat(groupIds);
        }

        const commands = await all(commandQuery, params);

        // Process commands to match format
        const processedCommands = await Promise.all(commands.map(async c => {
            let payload = {};
            try { payload = JSON.parse(c.command_payload); } catch (e) { }

            let groupMissions = [];
            if (c.type === 'group' && payload.is_group_mission && payload.request_ids && payload.request_ids.length > 0) {
                try {
                    groupMissions = await all(`SELECT id, type, lat, lng, sector, details, priority FROM rescue_requests WHERE id IN (${payload.request_ids.map(()=>'?').join(',')})`, payload.request_ids);
                } catch(e) {}
            }

            let reqDetails = null;
            let reqImage = null;
            let reqAudio = null;
            if (payload.rescue_req_id) {
                try {
                    const linkedReq = await get(`SELECT details, image_url, audio_url FROM rescue_requests WHERE id = ?`, [payload.rescue_req_id]);
                    if (linkedReq) {
                        reqDetails = linkedReq.details;
                        reqImage = linkedReq.image_url;
                        reqAudio = linkedReq.audio_url;
                    }
                } catch(e) {}
            }

            return {
                source: c.source,
                id: c.id,
                type: c.type,
                sector: payload.name || payload.sector || payload.message || c.sector || 'Group Cluster',
                status: c.status,
                lat: payload.lat || (groupMissions.length > 0 ? groupMissions[0].lat : null),
                lng: payload.lng || (groupMissions.length > 0 ? groupMissions[0].lng : null),
                image_url: reqImage,
                audio_url: reqAudio || (personalReqs.find(pr => String(pr.id) === String(payload.rescue_req_id))?.audio_url) || null,
                completion_image_url: c.completion_image_url || (personalReqs.find(pr => String(pr.id) === String(payload.rescue_req_id))?.completion_image_url) || null,
                priority: c.priority || 'normal',
                details: c.type === 'group' ? JSON.stringify({ isGroup: true, missions: groupMissions, custom_polygon: payload.custom_polygon || null }) : (reqDetails || payload.details || null),
                requester_phone: payload.requester_phone || null,

                requester_name: payload.requester_name || null,
                command_payload: c.command_payload,
                created_at: c.created_at,
                updated_at: c.updated_at
            };
        }));

        const combined = [...personalReqs, ...processedCommands].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        res.json(combined);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:id/history', async (req, res) => {
    try {
        const groups = await all(`SELECT group_id FROM group_members WHERE user_id = ?`, [req.params.id]);
        const groupIds = groups.map(g => g.group_id);
        
        let query = `SELECT * FROM rescue_requests WHERE assigned_user_id = ?`;
        let params = [req.params.id];
        
        if (groupIds.length > 0) {
            query += ` OR assigned_group_id IN (${groupIds.map(() => '?').join(',')})`;
            params = params.concat(groupIds);
        }
        
        query += ` ORDER BY updated_at DESC LIMIT 50`;
        
        const history = await all(query, params);
        res.json(history);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await all(`SELECT * FROM users ORDER BY registered_at DESC`);
        for (let user of users) {
            const userGroups = await all(`SELECT g.* FROM group_members gm JOIN groups g ON gm.group_id = g.id WHERE gm.user_id = ?`, [user.id]);
            user.groups = userGroups;
        }
        res.json(users);
    }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await get(`SELECT * FROM users WHERE id = ?`, [req.params.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const userGroups = await all(`SELECT g.* FROM group_members gm JOIN groups g ON gm.group_id = g.id WHERE gm.user_id = ?`, [user.id]);
        user.groups = userGroups;
        
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async (req, res) => {
    let { name, role, phone, device_id, group_ids, photo_url, password, serial_number, ai_managed } = req.body;
    phone = phone || null;
    try {
        const result = await run(`INSERT INTO users (name, role, phone, device_id, photo_url, password, serial_number, ai_managed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [name, role, phone, device_id, photo_url, password, serial_number, ai_managed ? 1 : 0]);
        const userId = result.lastID;

        if (group_ids && Array.isArray(group_ids)) {
            for (const gid of group_ids) {
                await run(`INSERT OR IGNORE INTO group_members (user_id, group_id) VALUES (?, ?)`, [userId, gid]);
            }
        }

        const user = await get(`SELECT * FROM users WHERE id = ?`, [userId]);
        const userGroups = await all(`SELECT g.* FROM group_members gm JOIN groups g ON gm.group_id = g.id WHERE gm.user_id = ?`, [userId]);
        user.groups = userGroups;

        await logCommand('USER_ADDED', 'Commander', name, { role, group_ids });
        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/:id', async (req, res) => {
    let { name, role, phone, device_id, status, group_ids, photo_url, password, serial_number, ai_managed } = req.body;
    const userId = req.params.id;
    try {
        const oldUser = await get(`SELECT * FROM users WHERE id = ?`, [userId]);
        if (!oldUser) return res.status(404).json({ error: 'User not found' });

        const safeName = name !== undefined ? name : oldUser.name;
        const safeRole = role !== undefined ? role : oldUser.role;
        const safePhone = (phone !== undefined && phone !== "") ? phone : (phone === "" ? null : oldUser.phone);
        const safeDeviceId = device_id !== undefined ? device_id : oldUser.device_id;
        const safeStatus = status !== undefined ? status : oldUser.status;
        const safePhotoUrl = photo_url !== undefined ? photo_url : oldUser.photo_url;
        const safePassword = password !== undefined ? password : oldUser.password;
        const safeSerialNumber = serial_number !== undefined ? serial_number : oldUser.serial_number;
        const safeAiManaged = ai_managed !== undefined ? (ai_managed ? 1 : 0) : oldUser.ai_managed;

        await run(`UPDATE users SET name = ?, role = ?, phone = ?, device_id = ?, status = ?, photo_url = ?, password = ?, serial_number = ?, ai_managed = ? WHERE id = ?`, 
            [safeName, safeRole, safePhone, safeDeviceId, safeStatus, safePhotoUrl, safePassword, safeSerialNumber, safeAiManaged, userId]);

        if (group_ids && Array.isArray(group_ids)) {
            await run(`DELETE FROM group_members WHERE user_id = ?`, [userId]);
            for (const gid of group_ids) {
                await run(`INSERT OR IGNORE INTO group_members (user_id, group_id) VALUES (?, ?)`, [userId, gid]);
            }
        }

        const user = await get(`SELECT * FROM users WHERE id = ?`, [userId]);
        const userGroups = await all(`SELECT g.* FROM group_members gm JOIN groups g ON gm.group_id = g.id WHERE gm.user_id = ?`, [userId]);
        user.groups = userGroups;

        // If password changed, send FORCE_LOGOUT
        if (oldUser && oldUser.password !== password) {
            socketManager.send(user.phone, 'FORCE_LOGOUT', { reason: 'Password changed by administrator' });
            socketManager.send(user.serial_number, 'FORCE_LOGOUT', { reason: 'Password changed by administrator' });
            if (user.device_id) {
                socketManager.send(user.device_id, 'FORCE_LOGOUT', { reason: 'Password changed by administrator' });
            }
            if (oldUser.device_id && oldUser.device_id !== user.device_id) {
                socketManager.send(oldUser.device_id, 'FORCE_LOGOUT', { reason: 'Password changed by administrator' });
            }
        }

        // If user is disabled, force local logout instantly via WebSocket sync
        if (status && (status === 'disabled' || status === 'inactive')) {
            socketManager.send(user.phone, 'USER_DISABLED', { reason: 'Account disabled by administrator' });
            socketManager.send(user.serial_number, 'USER_DISABLED', { reason: 'Account disabled by administrator' });
            if (device_id) {
                socketManager.send(device_id, 'USER_DISABLED', { reason: 'Account disabled by administrator' });
            }
            await logCommand('ACCESS_REVOKED', 'Admin', user.name || user.serial_number, { reason: 'Admin disabled account' });
        }

        res.json(user);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await get(`SELECT * FROM users WHERE id = ?`, [req.params.id]);
        if (user) {
            socketManager.send(user.phone, 'USER_DISABLED', { reason: 'Account deleted by administrator' });
            socketManager.send(user.serial_number, 'USER_DISABLED', { reason: 'Account deleted by administrator' });
            if (user.device_id) socketManager.send(user.device_id, 'USER_DISABLED', { reason: 'Account deleted by administrator' });
            await logCommand('ACCOUNT_DELETED', 'Admin', user.name || user.serial_number, { reason: 'Admin deleted account' });
        }
        await run(`DELETE FROM users WHERE id = ?`, [req.params.id]);
        await run(`DELETE FROM group_members WHERE user_id = ?`, [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Operation Types ──────────────────────────────────────────────────────────
app.get('/api/operation-types', async (req, res) => {
    try { res.json(await all(`SELECT * FROM operation_types ORDER BY name`)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/operation-types', async (req, res) => {
    const { name, color, icon, description } = req.body;
    try {
        const result = await run(`INSERT INTO operation_types (name, color, icon, description) VALUES (?, ?, ?, ?)`, [name, color, icon, description]);
        const ot = await get(`SELECT * FROM operation_types WHERE id = ?`, [result.lastID]);
        res.json(ot);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/operation-types/:id', async (req, res) => {
    const { name, color, icon, description } = req.body;
    try {
        await run(`UPDATE operation_types SET name = ?, color = ?, icon = ?, description = ? WHERE id = ?`, [name, color, icon, description, req.params.id]);
        const ot = await get(`SELECT * FROM operation_types WHERE id = ?`, [req.params.id]);
        res.json(ot);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/operation-types/:id', async (req, res) => {
    try {
        await run(`DELETE FROM operation_types WHERE id = ?`, [req.params.id]);
        res.json({ message: 'Operation type deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Settings ─────────────────────────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
    try {
        const rows = await all(`SELECT * FROM settings`);
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
    const { key, value } = req.body;
    try {
        await run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
        broadcast('SETTINGS_UPDATED', { key, value });
        if (key === 'sos_buffer_minutes') {
            broadcast('BUFFER_TIME_UPDATE', { minutes: parseInt(value) || 15 });
        }
        res.json({ message: 'Settings updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/public/status/:phone', async (req, res) => {
    const { phone } = req.params;
    try {
        const globalTotal = await get(`SELECT COUNT(*) as count FROM rescue_requests`);
        const globalActive = await get(`SELECT COUNT(*) as count FROM rescue_requests WHERE status != 'completed' AND status != 'declined'`);
        const userActive = await all(`SELECT * FROM rescue_requests WHERE (phone = ? OR device_id = ?) AND status != 'completed' AND status != 'declined' ORDER BY created_at DESC`, [phone, phone]);
        const userHistory = await all(`SELECT * FROM rescue_requests WHERE (phone = ? OR device_id = ?) AND (status = 'completed' OR status = 'declined') ORDER BY updated_at DESC LIMIT 10`, [phone, phone]);
        
        res.json({
            stats: {
                totalSos: globalTotal.count,
                activeMissions: globalActive.count
            },
            myActive: userActive,
            myHistory: userHistory
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Map Cache ────────────────────────────────────────────────────────────────
app.get('/api/map-cache', async (req, res) => {
    try { res.json(await all(`SELECT * FROM map_cache ORDER BY downloaded_at DESC`)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/map-cache', async (req, res) => {
    const { name, type, center_lat, center_lng, radius_km, state, district } = req.body;
    // Simulate tile count and size
    const approxTiles = Math.round((radius_km || 10) * (radius_km || 10) * 3.14 * 4);
    const sizeMb = parseFloat(((approxTiles * 15) / 1024).toFixed(2));
    try {
        const result = await run(
            `INSERT INTO map_cache (name, type, center_lat, center_lng, radius_km, state, district, tile_count, size_mb) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, type || 'radius', center_lat, center_lng, radius_km, state, district, approxTiles, sizeMb]
        );
        const entry = await get(`SELECT * FROM map_cache WHERE id = ?`, [result.lastID]);
        broadcast('MAP_DOWNLOADED', entry);
        res.json(entry);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/map-cache/:id', async (req, res) => {
    try {
        await run(`DELETE FROM map_cache WHERE id = ?`, [req.params.id]);
        res.json({ message: 'Map cache deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Sync ─────────────────────────────────────────────────────────────────────
app.post('/api/sync', async (req, res) => {
    const { phone, deviceId, role, location, sosAlert } = req.body;

    // Identify user by phone (primary) or deviceId
    const identifier = phone || deviceId;
    if (!identifier) return res.status(400).json({ error: 'phone or deviceId required' });

    // Try to find user in DB
    let user = await get(`SELECT * FROM users WHERE phone = ? OR device_id = ?`, [identifier, identifier]);

    // If user exists and we have a new deviceId, update it (pairing)
    if (user && deviceId && user.device_id !== deviceId) {
        await run(`UPDATE users SET device_id = ? WHERE id = ?`, [deviceId, user.id]);
        user.device_id = deviceId;
    }

    const effectiveDeviceId = user ? user.device_id : (deviceId || identifier);

    if (location) {
        db.run(`INSERT OR REPLACE INTO rescuer_locations (device_id, group_id, name, lat, lng, last_updated) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [effectiveDeviceId, location.groupId, location.name || (user ? user.name : null), location.lat, location.lng]);
        broadcast('LIVE_LOCATION_UPDATE', { deviceId: effectiveDeviceId, ...location });
    }

    if (sosAlert) {
        const details = JSON.stringify(sosAlert.details || {});
        const isPriority = sosAlert.isPriority || 0;
        
        // Prevent duplicate SOS entry for the same device_id/phone if there is already an active SOS
        const activeSosReq = await get(`SELECT id FROM rescue_requests WHERE device_id = ? AND status NOT IN ('completed', 'resolved', 'cancelled', 'finished') AND type = 'sos'`, [effectiveDeviceId]);
        
        if (activeSosReq) {
            // Update existing active SOS instead of duplicating
            await run(`UPDATE rescue_requests SET lat = ?, lng = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [sosAlert.lat, sosAlert.lng, activeSosReq.id]);
            
            // Also update the UI with the latest coords via an update event
            const reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [activeSosReq.id]);
            broadcastToAdminAndTarget('RESCUE_REQUEST_UPDATE', reqData, reqData.assigned_user_id);
            
            // Log update
            await logCommand('SOS_UPDATED', effectiveDeviceId, 'Command Center', { reqId: activeSosReq.id, lat: sosAlert.lat, lng: sosAlert.lng });
        } else {
            db.run(`INSERT INTO sos_alerts (device_id, phone, lat, lng, details, is_priority) VALUES (?, ?, ?, ?, ?, ?)`,
                [effectiveDeviceId, phone || (user ? user.phone : null), sosAlert.lat, sosAlert.lng, details, isPriority], async function (err) {
                    if (!err) {
                        const alertData = { 
                            id: this.lastID, 
                            deviceId: effectiveDeviceId, 
                            phone: phone || (user ? user.phone : null),
                            name: sosAlert.name || (user ? user.name : 'Citizen'),
                            lat: sosAlert.lat, 
                            lng: sosAlert.lng, 
                            details: sosAlert.details, 
                            is_priority: isPriority 
                        };
                        broadcast('SOS_ALERT', alertData, 'admin');
                        await logCommand('SOS_RECEIVED', effectiveDeviceId, 'Command Center', alertData);
                        triggerBackup();

                        // Insert into rescue_requests to trigger AI auto-assignment
                        const reqDetails = JSON.stringify({ source: 'public_app', isPriority: isPriority, ...sosAlert.details });
                        db.run(`INSERT INTO rescue_requests (device_id, phone, name, type, lat, lng, details, urgency) VALUES (?, ?, ?, 'sos', ?, ?, ?, ?)`, 
                            [effectiveDeviceId, phone || (user ? user.phone : null), sosAlert.name || (user ? user.name : 'Citizen'), sosAlert.lat, sosAlert.lng, reqDetails, isPriority ? 'critical' : 'high'], async function (err2) {
                                if (!err2) {
                                    const reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [this.lastID]);
                                    broadcast('NEW_RESCUE_REQUEST', reqData, 'admin');
                                }
                            });

                        // Notify public user
                        const msg = isPriority
                            ? 'Your priority SOS request is received. A rescue team has been dispatched to your location.'
                            : 'Your SOS request is received. Our rescue team will reach you shortly. Please stay calm.';
                        await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                            [effectiveDeviceId, 'sos_ack', msg, 0]);
                    }
                });
        }
    }

    // Return pending commands + notifications
    // If it's a rescuer, fetch commands for their group
    let userGroupIds = [];
    if (user) {
        const groups = await all(`SELECT group_id FROM group_members WHERE user_id = ?`, [user.id]);
        userGroupIds = groups.map(g => g.group_id);
    }

    const [commands, zones, setting, notifs, myRequests, refreshSetting] = await Promise.all([
        all(`
            SELECT cq.*, rr.image_url, COALESCE(rr.details, CASE WHEN json_valid(cq.command_payload) THEN json_extract(cq.command_payload, '$.details') ELSE NULL END) as details
            FROM command_queue cq
            LEFT JOIN rescue_requests rr ON CAST(rr.id AS TEXT) = (CASE WHEN json_valid(cq.command_payload) THEN CAST(json_extract(cq.command_payload, '$.rescue_req_id') AS TEXT) ELSE NULL END)
            WHERE cq.status NOT IN ('completed', 'declined', 'finished')
        `),
        all(`SELECT * FROM operation_zones WHERE status = 'active'`),
        get(`SELECT value FROM settings WHERE key = 'sos_interval'`),
        all(`SELECT * FROM notifications WHERE (device_id = ? OR device_id = ?) AND read = 0`, [effectiveDeviceId, phone || effectiveDeviceId]),
        all(`SELECT id, type, status, sector, urgency, assigned_phone, updated_at FROM rescue_requests WHERE phone = ? OR device_id = ? ORDER BY created_at DESC LIMIT 5`, [phone || effectiveDeviceId, effectiveDeviceId]),
        get(`SELECT value FROM settings WHERE key = 'refresh_interval'`)
    ]);

    // Mark notifications as sent (read)
    if (notifs.length > 0) {
        await run(`UPDATE notifications SET read = 1 WHERE device_id = ? OR device_id = ?`, [effectiveDeviceId, phone || effectiveDeviceId]);
    }

    const cleanInputPhone = phone ? phone.replace(/\D/g, '').slice(-10) : null;
    const cleanDeviceId = effectiveDeviceId ? effectiveDeviceId.replace(/\D/g, '').slice(-10) : null;

    // Filter commands: return commands targeting this user's phone or their group
    const filteredCommands = commands.filter(c => {
        const cPhone = c.target_phone ? c.target_phone.replace(/\D/g, '').slice(-10) : null;
        if (cPhone && cleanInputPhone && cPhone === cleanInputPhone) return true;
        if (cPhone && cleanDeviceId && cPhone === cleanDeviceId) return true;
        if (c.target_phone && c.target_phone === effectiveDeviceId) return true;
        if (c.target_phone && user && c.target_phone === user.id.toString()) return true; // Fix ID targeting
        
        // Only return true if a valid group_id matches. Don't broadcast to all if both target_phone and group_id are null.
        if (!c.target_phone && c.group_id && userGroupIds.includes(c.group_id)) return true;
        
        return false;
    });

    res.json({
        commands: filteredCommands,
        zones,
        sos_interval: setting ? setting.value : '15',
        refresh_interval: refreshSetting ? refreshSetting.value : '5',
        notifications: notifs,
        my_requests: myRequests,
        user: user ? { 
            id: user.id, 
            name: user.name, 
            role: user.role, 
            phone: user.phone, 
            interrupted_task_id: user.interrupted_task_id,
            group_ids: userGroupIds 
        } : null
    });
});

// ─── SOS ──────────────────────────────────────────────────────────────────────
app.get('/api/sos', async (req, res) => {
    try { res.json(await all(`SELECT * FROM sos_alerts ORDER BY timestamp DESC`)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/sos/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        await run(`UPDATE sos_alerts SET status = ? WHERE id = ?`, [status, req.params.id]);
        res.json({ message: 'Updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Rescuers ──────────────────────────────────────────────────────────────────
app.get('/api/rescuers', async (req, res) => {
    try { res.json(await all(`SELECT * FROM rescuer_locations`)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Rescue Requests ────────────────────────────────────────────────────────────
app.get('/api/rescue-requests/my-history', async (req, res) => {
    const { phone, device_id } = req.query;
    try {
        if (!phone && !device_id) return res.json([]);
        
        let query = `
            SELECT rr.*, 
                   COALESCE(u_completed.name, u_assigned.name) as assigned_officer_name,
                   g_assigned.group_name as assigned_group_name
            FROM rescue_requests rr
            LEFT JOIN sos_completion_log scl ON rr.id = scl.rescue_req_id
            LEFT JOIN users u_completed ON scl.completed_by_rescuer_id = u_completed.id
            LEFT JOIN users u_assigned ON rr.assigned_user_id = u_assigned.id
            LEFT JOIN groups g_assigned ON rr.assigned_group_id = g_assigned.id
            WHERE 1=1
        `;
        let params = [];
        
        let conditions = [];
        if (phone) {
            conditions.push(`rr.phone = ?`);
            params.push(phone);
        }
        if (device_id) {
            conditions.push(`rr.device_id = ?`);
            params.push(device_id);
        }
        
        if (conditions.length > 0) {
            query += ` AND (${conditions.join(' OR ')})`;
        }
        
        query += ` ORDER BY COALESCE(rr.updated_at, rr.created_at) DESC`;
        res.json(await all(query, params));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/rescue-requests', async (req, res) => {
    const { status } = req.query;
    try {
        let query = `
            SELECT rr.*, 
                   COALESCE(u_completed.name, u_assigned.name) as assigned_officer_name,
                   g_assigned.group_name as assigned_group_name
            FROM rescue_requests rr
            LEFT JOIN sos_completion_log scl ON rr.id = scl.rescue_req_id
            LEFT JOIN users u_completed ON scl.completed_by_rescuer_id = u_completed.id
            LEFT JOIN users u_assigned ON rr.assigned_user_id = u_assigned.id
            LEFT JOIN groups g_assigned ON rr.assigned_group_id = g_assigned.id
        `;
        let params = [];
        if (status === 'active') {
            query += ` WHERE rr.status IN ('pending', 'accepted', 'partially_declined', 'in_progress', 'assigned')`;
        } else if (status) {
            query += ` WHERE rr.status = ?`;
            params.push(status);
        }
        query += ` ORDER BY rr.urgency DESC, COALESCE(rr.updated_at, rr.created_at) DESC`;
        res.json(await all(query, params));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/rescue-requests', async (req, res) => {
    const { device_id, phone, name, type, lat, lng, details, urgency, sector, priority, image_data } = req.body;
    try {
        // Enforce SOS Buffer
        const bufferSetting = await get(`SELECT value FROM settings WHERE key = 'sos_buffer_minutes'`);
        const bufferMinutes = bufferSetting ? parseInt(bufferSetting.value) || 0 : 0;
        
        if (bufferMinutes > 0) {
            const lastReq = await get(`SELECT status, created_at FROM rescue_requests WHERE phone = ? OR device_id = ? ORDER BY created_at DESC LIMIT 1`, [phone, device_id]);
            if (lastReq) {
                if (lastReq.status === 'completed' || lastReq.status === 'declined') {
                    // Bypass buffer
                } else {
                    const lastTime = new Date(lastReq.created_at).getTime();
                    const now = new Date().getTime();
                    const diffMinutes = (now - lastTime) / (1000 * 60);
                    if (diffMinutes < bufferMinutes) {
                        const waitTime = Math.ceil(bufferMinutes - diffMinutes);
                        return res.status(429).json({ error: `SOS BUFFER ACTIVE. Please wait ${waitTime} more minute(s) before submitting another request.` });
                    }
                }
            }
        }

        let imageUrl = null;
        if (image_data) {
            try {
                // Remove data:image/...;base64, prefix and parse safely
                const matches = image_data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/s);
                let extension = 'jpg';
                let base64Data = '';

                if (matches && matches.length === 3) {
                    extension = matches[1].toLowerCase();
                    base64Data = matches[2];
                } else if (image_data.includes('base64,')) {
                    const parts = image_data.split('base64,');
                    base64Data = parts[1];
                    if (parts[0].includes('png')) extension = 'png';
                }

                if (base64Data) {
                    // Remove whitespace/newlines from base64 string
                    base64Data = base64Data.replace(/\s+/g, '');
                    const fileName = `sos_${Date.now()}.${extension === 'png' ? 'png' : 'jpg'}`;
                    const uploadPath = path.join(__dirname, 'uploads', fileName);
                    fs.writeFileSync(uploadPath, base64Data, 'base64');
                    imageUrl = `/uploads/${fileName}`;
                }
            } catch (err) {
                console.error('Image upload error:', err);
            }
        }

        let audioUrl = null;
        if (req.body.audio_data) {
            try {
                const audio_data = req.body.audio_data;
                const matches = audio_data.match(/^data:audio\/([a-zA-Z0-9+]+);base64,(.+)$/s);
                let extension = 'm4a'; // default
                let base64Data = '';

                if (matches && matches.length === 3) {
                    extension = matches[1].toLowerCase();
                    base64Data = matches[2];
                } else if (audio_data.includes('base64,')) {
                    const parts = audio_data.split('base64,');
                    base64Data = parts[1];
                    if (parts[0].includes('mp3')) extension = 'mp3';
                    else if (parts[0].includes('wav')) extension = 'wav';
                    else if (parts[0].includes('3gp')) extension = '3gp';
                    else if (parts[0].includes('webm')) extension = 'webm';
                } else {
                    base64Data = audio_data;
                }

                if (base64Data) {
                    base64Data = base64Data.replace(/\s+/g, '');
                    const fileName = `sos_audio_${Date.now()}.${extension}`;
                    const uploadPath = path.join(__dirname, 'uploads', fileName);
                    fs.writeFileSync(uploadPath, base64Data, 'base64');
                    audioUrl = `/uploads/${fileName}`;
                }
            } catch (err) {
                console.error('Audio upload error:', err);
            }
        }

        const result = await run(`INSERT INTO rescue_requests (device_id, phone, name, type, lat, lng, details, urgency, priority, sector, image_url, audio_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [device_id, phone, name || 'Citizen', type || 'pregnancy', lat, lng, details, urgency || 'high', priority || 'normal', sector || 'Unknown Zone', imageUrl, audioUrl]);
        await run(`INSERT INTO sos_assignment_history (rescue_req_id, action) VALUES (?, 'requested')`, [result.lastID]);
        const reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [result.lastID]);
        broadcast('NEW_RESCUE_REQUEST', reqData, 'admin');
        await logCommand('RESCUE_REQUEST_CREATED', phone || device_id, 'Command Center', reqData);

        // Notify the user
        await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
            [device_id, 'rescue_ack', `Your priority ${type} rescue request is received. A team will be assigned shortly.`, 0]);

        // Trigger AI auto-assignment immediately
        runAIAssignment();

        triggerBackup();
        reqData.buffer_minutes = bufferMinutes;
        res.json(reqData);

        // Trigger AI auto-assignment
        setTimeout(runAIAssignment, 500);

        // Trigger regrouping after new request for normal tasks
        const normalTypes = ['food', 'supply', 'medical supply'];
        if (normalTypes.some(t => (type || '').toLowerCase().includes(t))) {
            setTimeout(groupTasks, 500);
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/rescue-requests/:id/accept', async (req, res) => {
    const { assigned_user_id, assigned_group_id } = req.body;
    try {
        const currentReq = await get(`SELECT status, assigned_user_id FROM rescue_requests WHERE id = ?`, [req.params.id]);
        if (!currentReq) return res.status(404).json({ error: "Request not found." });
        if (currentReq.status === 'assigned' && currentReq.assigned_user_id !== assigned_user_id) {
            return res.status(403).json({ error: "Task has already been assigned to another rescuer or reassigned due to timeout." });
        }
        if (currentReq.status === 'completed' || currentReq.status === 'finished') {
            return res.status(400).json({ error: "Task is already completed." });
        }

        await run(`UPDATE rescue_requests SET status = 'assigned', assigned_user_id = ?, assigned_group_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [assigned_user_id, assigned_group_id, req.params.id]);

        const reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [req.params.id]);

        // Find assigned user phone and device
        let assignedPhone = null;
        let assignedDeviceId = null;
        let assignedName = 'Team';
        if (assigned_user_id) {
            const user = await get(`SELECT phone, device_id, name FROM users WHERE id = ?`, [assigned_user_id]);
            if (user) {
                assignedPhone = user.phone;
                assignedDeviceId = user.device_id;
                assignedName = user.name;

                const notifDevice = assignedDeviceId || assignedPhone || 'unknown_device';
                const safeTypeStr = (reqData.type || 'Request').toUpperCase();
                await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                    [notifDevice, 'dispatch', `NEW DISPATCH: ${safeTypeStr} at ${reqData.sector || 'Unknown'}. Urgency: ${reqData.urgency || 'High'}. Please proceed immediately.`, 1]);
            }
        }

        // Determine if this is a critical mission or a normal task
        // Priority from request or heuristic fallback
        let commandType = req.body.priority || 'critical';
        if (!req.body.priority) {
            const lowType = (reqData.type || '').toLowerCase();
            if (['food', 'delivery', 'supply'].some(t => lowType.includes(t))) {
                commandType = 'normal';
            } else if (reqData.urgency === 'low' || reqData.urgency === 'medium') {
                commandType = 'normal';
            }
        }

        // AUTO-CREATE COMMAND FOR ACCEPTED REQUEST
        const safeTypeStr2 = (reqData.type || 'Request').toUpperCase();
        const cmdPayload = JSON.stringify({
            message: `${safeTypeStr2} ${commandType === 'normal' ? 'TASK' : 'RESCUE'} at ${reqData.sector || 'Unknown'}`,
            sector: reqData.sector || 'Unknown',
            lat: reqData.lat || 0,
            lng: reqData.lng || 0,
            urgency: reqData.urgency || 'high',
            rescue_req_id: reqData.id,
            requester_name: reqData.name || 'Citizen',
            requester_phone: reqData.phone || 'Unknown',
            details: reqData.details || ''
        });

        const existingManualCommand = await get(`SELECT * FROM command_queue WHERE (CASE WHEN json_valid(command_payload) THEN json_extract(command_payload, '$.rescue_req_id') ELSE NULL END) = ?`, [reqData.id]);
        
        let targetCmdId = null;
        if (existingManualCommand) {
            await run(`UPDATE command_queue SET group_id = ?, target_phone = ?, command_payload = ?, status = 'assigned', priority = ?, assigned_by = 'Admin', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [assigned_group_id || null, assignedPhone || assignedDeviceId || null, cmdPayload, commandType, existingManualCommand.id]);
            targetCmdId = existingManualCommand.id;
        } else {
            await run(`INSERT INTO command_queue (group_id, target_phone, command_type, command_payload, status, priority, assigned_by) VALUES (?, ?, ?, ?, 'assigned', ?, 'Admin')`,
                [assigned_group_id || null, assignedPhone || assignedDeviceId || null, commandType, cmdPayload, commandType]);
            const newRow = await get('SELECT last_insert_rowid() as id');
            targetCmdId = newRow ? newRow.id : null;
        }

        // Notify the original requester
        if (reqData.device_id) {
            await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                [reqData.device_id, 'rescue_dispatched', `Update: ${assignedName} has been assigned to your request. Stay safe!`, 0]);
        }

        broadcastToAdminAndTarget('RESCUE_REQUEST_UPDATE', { ...reqData, assignedName, assigned_phone: assignedPhone, priority: commandType }, targetUserId || targetDeviceId);
        
        // Fetch the full command object to broadcast to the rescuer
        if (targetCmdId) {
            await broadcastToAdminAndTarget('NEW_COMMAND', cmdData, targetUserId || targetDeviceId);
        }

        await logCommand('RESCUE_REQUEST_ACCEPTED', 'Commander', `Request ID: ${req.params.id}`, { assigned_user_id, assigned_group_id, commandType });
        triggerBackup();
        res.json(reqData);
    } catch (e) {
        console.error("Error accepting request:", e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/rescue-requests/:id/decline', async (req, res) => {
    try {
        const { rescuer_phone } = req.body || {};
        const cleanedPhone = (rescuer_phone || '').replace(/\D/g, '').slice(-10);
        let rescuer = null;
        if (cleanedPhone) {
            rescuer = await get(`SELECT id, device_id FROM users WHERE phone = ? OR device_id = ? OR id = ? OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ?`, [rescuer_phone, rescuer_phone, rescuer_phone, `%${cleanedPhone}`]);
        } else if (rescuer_phone) {
            rescuer = await get(`SELECT id, device_id FROM users WHERE phone = ? OR device_id = ? OR id = ?`, [rescuer_phone, rescuer_phone, rescuer_phone]);
        }

        const reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [req.params.id]);
        if (rescuer && !reqData.assigned_group_id && reqData.assigned_user_id !== rescuer.id) {
            return res.status(403).json({ error: 'Task is no longer assigned to you.' });
        }

        const descAppend = rescuer ? `\n[Declined by Rescuer ID: ${rescuer.id}]` : `\n[Declined by Admin]`;
        const reqObj = await get(`SELECT assignment_version FROM rescue_requests WHERE id = ?`, [req.params.id]);
        const nextVersion = (reqObj ? reqObj.assignment_version || 0 : 0) + 1;
        
        // If rescuer is null, the admin manually declined the request, so mark status as 'declined' permanently.
        const targetStatus = rescuer ? 'partially_declined' : 'declined';

        await run(`UPDATE rescue_requests SET status = ?, assigned_user_id = NULL, details = coalesce(details, '') || ?, updated_at = CURRENT_TIMESTAMP, assignment_version = ?, assignment_timestamp = CURRENT_TIMESTAMP WHERE id = ?`, [targetStatus, descAppend, nextVersion, req.params.id]);
        await run(`UPDATE command_queue SET status = 'declined', updated_at = CURRENT_TIMESTAMP, assignment_version = ? WHERE (command_payload LIKE ? OR command_payload LIKE ?) AND status NOT IN ('completed', 'cancelled')`, [nextVersion, `%"rescue_req_id":${req.params.id}%`, `%"rescue_req_id":"${req.params.id}"%`]);
        if (rescuer) {
            await run(`INSERT INTO sos_assignment_history (rescue_req_id, rescuer_id, action) VALUES (?, ?, 'declined')`, [req.params.id, rescuer.id]);
            broadcastToAdminAndTarget('TASK_REVOKED', { task_id: req.params.id, old_rescuer_id: rescuer.id, new_assignment_version: nextVersion }, rescuer.device_id);
        }
        await run(`INSERT INTO sos_assignment_history (rescue_req_id, action) VALUES (?, 'returned_to_pending')`, [req.params.id]);
        const updatedReqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [req.params.id]);

        broadcastToAdminAndTarget('RESCUE_REQUEST_DECLINED_REASSIGN', updatedReqData, updatedReqData.assigned_user_id);
        await logCommand('RESCUE_REQUEST_DECLINED', 'Commander', `Request ID: ${req.params.id}`, {});
        triggerBackup();
        res.json({ message: 'Request declined' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Status update for rescuer to mark completed
app.put('/api/rescue-requests/:id/status', async (req, res) => {
    const { status, rescuer_phone, completion_image } = req.body;
    const validStatuses = ['pending', 'accepted', 'completed', 'declined', 'in_progress', 'closed'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    try {
        let finalStatus = status;
        let reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [req.params.id]);
        if (status === 'pending') {
            await run(`DELETE FROM sos_assignment_history WHERE rescue_req_id = ? AND action IN ('ignored', 'declined')`, [req.params.id]);
        }

        // Find the rescuer who is accepting or completing the task (robust match on phone/device_id)
        const rPhone = rescuer_phone;
        const cleanedPhone = (rPhone || '').replace(/\D/g, '').slice(-10);
        let rescuer = null;
        if (cleanedPhone) {
            rescuer = await get(`SELECT id, phone, device_id, name FROM users WHERE phone = ? OR device_id = ? OR id = ? OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ?`, [rPhone, rPhone, rPhone, `%${cleanedPhone}`]);
        } else {
            rescuer = await get(`SELECT id, phone, device_id, name FROM users WHERE phone = ? OR device_id = ? OR id = ?`, [rPhone, rPhone, rPhone]);
        }

        if (status !== 'closed' && !reqData.assigned_group_id) {
            if (reqData.assigned_user_id) {
                if (!rescuer || reqData.assigned_user_id !== rescuer.id) {
                    return res.status(403).json({ error: 'Task is no longer assigned to this rescuer.' });
                }
            } else {
                // If it is unassigned/pending, it can only be accepted/assigned. Completing or in_progress changes on unassigned requests are rejected
                if (status !== 'accepted' && status !== 'declined') {
                    return res.status(403).json({ error: 'Task is no longer assigned to this rescuer.' });
                }
            }
        }

        if (status === 'completed') {
            if (rescuer) {
                await run(`INSERT OR IGNORE INTO rescuer_task_completions (task_id, rescuer_id) VALUES (?, ?)`, [req.params.id, rescuer.id]);

                if (reqData.assigned_group_id) {
                    const assignedRescuers = await all(`SELECT user_id FROM group_members WHERE group_id = ?`, [reqData.assigned_group_id]);
                    const completedRescuers = await all(`SELECT rescuer_id FROM rescuer_task_completions WHERE task_id = ?`, [req.params.id]);

                    if (completedRescuers.length < assignedRescuers.length) {
                        finalStatus = 'in_progress';
                    }
                }
            }
        }

        let compImageUrl = null;
        if (completion_image) {
            compImageUrl = saveCompletionImage(completion_image);
        }

        const existingCommand = await get(`SELECT * FROM command_queue WHERE command_payload LIKE ? OR command_payload LIKE ?`, [`%"rescue_req_id":${req.params.id}%`, `%"rescue_req_id":"${req.params.id}"%`]);

        if (compImageUrl) {
            if (['accepted', 'in_progress', 'completed'].includes(status) && rescuer) {
                await run(`UPDATE rescue_requests SET status = ?, completion_image_url = ?, assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [finalStatus, compImageUrl, rescuer.id, req.params.id]);
            } else {
                await run(`UPDATE rescue_requests SET status = ?, completion_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [finalStatus, compImageUrl, req.params.id]);
            }
        } else {
            if (['accepted', 'in_progress', 'completed'].includes(status) && rescuer) {
                // Ensure the rescue request is explicitly assigned to this rescuer so it doesn't disappear from their history
                await run(`UPDATE rescue_requests SET status = ?, assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [finalStatus, rescuer.id, req.params.id]);
            } else {
                await run(`UPDATE rescue_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [finalStatus, req.params.id]);
            }
        }
        
        // AUDIT TRAIL LOGGING
        const rescuerIdToLog = rescuer ? rescuer.id : (reqData ? reqData.assigned_user_id : null);
        if (rescuerIdToLog) {
            await run(`INSERT INTO sos_assignment_history (rescue_req_id, rescuer_id, action) VALUES (?, ?, ?)`, [req.params.id, rescuerIdToLog, status]);
            if (status === 'completed') {
                await run(`INSERT OR IGNORE INTO sos_completion_log (rescue_req_id, completed_by_rescuer_id, evidence_url) VALUES (?, ?, ?)`, [req.params.id, rescuerIdToLog, compImageUrl || null]);
            }
        }
        if (status === 'declined') {
            await run(`INSERT INTO sos_assignment_history (rescue_req_id, action) VALUES (?, 'returned_to_pending')`, [req.params.id]);
        }
        
        if (existingCommand) {
            if (compImageUrl) {
                await run(`UPDATE command_queue SET status = ?, completion_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [finalStatus, compImageUrl, existingCommand.id]);
            } else {
                await run(`UPDATE command_queue SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [finalStatus, existingCommand.id]);
            }
        } else if (['accepted', 'in_progress', 'completed'].includes(status)) {
            // Auto-create command if it didn't exist (e.g., rescuer manually picked it up from public pool)
            let commandType = reqData.priority || 'critical';
            if (!reqData.priority || reqData.priority === 'normal') {
                const lowType = (reqData.type || '').toLowerCase();
                if (['food', 'delivery', 'supply', 'medical_delivery'].some(t => lowType.includes(t))) {
                    commandType = 'normal';
                } else if (reqData.urgency === 'low' || reqData.urgency === 'medium') {
                    commandType = 'normal';
                }
            }
            const safeTypeStr = (reqData.type || 'Request').toUpperCase();
            const cmdPayload = JSON.stringify({
                message: `SELF-ASSIGNED: ${safeTypeStr} at ${reqData.sector || 'Unknown'}`,
                sector: reqData.sector || 'Unknown',
                lat: reqData.lat || 0,
                lng: reqData.lng || 0,
                urgency: reqData.urgency || 'high',
                rescue_req_id: reqData.id,
                requester_name: reqData.name || 'Citizen',
                requester_phone: reqData.phone || 'Unknown',
                details: reqData.details || '',
                assigned_by: 'Self'
            });
            const tPhone = rescuer ? (rescuer.phone || rescuer.device_id || rescuer.id) : null;
            await run(`INSERT INTO command_queue (target_phone, command_type, command_payload, status, priority, assigned_by) VALUES (?, ?, ?, ?, ?, 'Self')`,
                [tPhone, commandType, cmdPayload, finalStatus, commandType]);
        }

        reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [req.params.id]);
        if (reqData) broadcastToAdminAndTarget('RESCUE_REQUEST_UPDATE', reqData, reqData.assigned_user_id);

        if (finalStatus === 'completed' && reqData) {
            // Dismiss pending new_task notification for this request ID
            await run(`UPDATE notifications SET read = 1 WHERE message LIKE ? OR message LIKE ?`, [`%${req.params.id}%`, `%${reqData.serial_number}%`]);

            // Notify original requester
            if (reqData.device_id) {
                await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                    [reqData.device_id, 'rescue_completed', `✅ Your rescue mission is complete! The rescue team has reached you. Stay safe.`, 0]);
            }
            if (reqData.phone) {
                await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                    [reqData.phone, 'rescue_completed', `✅ Your rescue mission is complete! The rescue team has reached you. Stay safe.`, 0]);
            }
            
            // Everyone completed, dissolve zone if it was the last task
            const zoneTasks = await all(`SELECT id FROM rescue_requests WHERE sector = ? AND status != 'completed'`, [reqData.sector]);
            if (zoneTasks.length === 0 && reqData.sector) {
                await run(`UPDATE operation_zones SET status = 'inactive' WHERE zone_name = ?`, [reqData.sector]);
                broadcast('ZONE_DISSOLVED', { zone_name: reqData.sector });
                await logCommand('ZONE_DISSOLVED', 'System', reqData.sector, {});
            }

            broadcastToAdminAndTarget('RESCUE_REQUEST_COMPLETED', reqData, reqData.assigned_user_id);
            await logCommand('RESCUE_STATUS_UPDATE', rescuer_phone || 'Rescuer', `Request ID: ${req.params.id}`, { status: 'completed' });
        } else if (finalStatus === 'in_progress' && status === 'completed') {
            broadcastToAdminAndTarget('RESCUE_REQUEST_IN_PROGRESS', reqData, reqData.assigned_user_id);
            await logCommand('RESCUE_STATUS_UPDATE', rescuer_phone || 'Rescuer', `Request ID: ${req.params.id}`, { status: 'rescuer_completed_waiting' });
        } else {
            broadcastToAdminAndTarget('RESCUE_REQUEST_' + finalStatus.toUpperCase(), reqData, reqData.assigned_user_id);
            await logCommand('RESCUE_STATUS_UPDATE', rescuer_phone || 'Rescuer', `Request ID: ${req.params.id}`, { status: finalStatus });
        }

        if (finalStatus === 'completed' || finalStatus === 'declined') {
            setTimeout(runAIAssignment, 500);
        }

        triggerBackup();
        res.json(reqData);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/rescue-requests/:id/timeline', async (req, res) => {
    try {
        const timeline = await all(`
            SELECT h.*, u.name as rescuer_name, u.serial_number as rescuer_serial
            FROM sos_assignment_history h
            LEFT JOIN users u ON h.rescuer_id = u.id
            WHERE h.rescue_req_id = ?
            ORDER BY h.created_at ASC, h.id ASC
        `, [req.params.id]);
        res.json(timeline);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/rescue-requests/:id/location', async (req, res) => {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'Lat and Lng are required' });
    try {
        await run(`UPDATE rescue_requests SET lat = ?, lng = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [lat, lng, req.params.id]);
        const reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [req.params.id]);
        broadcastToAdminAndTarget('RESCUE_REQUEST_LOCATION_UPDATED', reqData, reqData.assigned_user_id);
        await logCommand('RESCUE_LOCATION_UPDATE', 'Admin', `Request ID: ${req.params.id}`, { lat, lng });
        triggerBackup();
        res.json(reqData);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get command by ID
app.get('/api/commands/:id', async (req, res) => {
    try {
        const cmd = await get(`SELECT * FROM command_queue WHERE id = ?`, [req.params.id]);
        if (!cmd) return res.status(404).json({ error: 'Command not found' });
        res.json(cmd);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get all commands for admin dashboard
app.get('/api/commands', async (req, res) => {
    try {
        // Try to join with rescue_requests to get requester details
        const commands = await all(`
            SELECT cq.*, 
                   rr.id as requester_db_id,
                   COALESCE(u.name, rr.device_id) as requester_name, 
                   rr.phone as requester_phone, 
                   rr.details as requester_details,
                   rr.type as requester_type,
                   rr.lat as requester_lat,
                   rr.lng as requester_lng,
                   rr.urgency as requester_urgency,
                   rr.created_at as request_time,
                   rr.image_url as requester_image_url,
                   rr.audio_url as requester_audio_url,
                   rr.completion_image_url as req_completion_image_url,
                   u_assigned.name as assigned_officer_name,
                   g.group_name as assigned_group_name
            FROM command_queue cq
            LEFT JOIN rescue_requests rr ON CAST(rr.id AS TEXT) = (CASE WHEN json_valid(cq.command_payload) THEN CAST(json_extract(cq.command_payload, '$.rescue_req_id') AS TEXT) ELSE NULL END)
            LEFT JOIN users u ON u.device_id = rr.device_id OR u.phone = rr.phone
            LEFT JOIN users u_assigned ON cq.target_phone = u_assigned.phone OR cq.target_phone = u_assigned.device_id
            LEFT JOIN groups g ON cq.group_id = g.id
            GROUP BY cq.id
            ORDER BY COALESCE(cq.updated_at, cq.created_at) DESC
        `);
        res.json(commands);
    } catch (e) {
        // Fallback if json_extract is not supported
        try {
            const commands = await all(`SELECT * FROM command_queue ORDER BY COALESCE(updated_at, created_at) DESC`);
            res.json(commands);
        } catch (innerError) {
            res.status(500).json({ error: innerError.message });
        }
    }
});



// Direct command from admin to a specific rescuer/group
app.post('/api/commands', async (req, res) => {
    const { target_phone, target_user_id, group_id, command_type, command_payload, actor } = req.body;
    let effectivePhone = target_phone;

    try {
        if (target_user_id && !effectivePhone) {
            const user = await get(`SELECT phone, device_id FROM users WHERE id = ?`, [target_user_id]);
            if (user) effectivePhone = user.phone || user.device_id;
        }

        const result = await run(
            `INSERT INTO command_queue (group_id, target_phone, command_type, command_payload, priority) VALUES (?, ?, ?, ?, ?)`,
            [group_id || null, effectivePhone || null, command_type || 'direct', JSON.stringify(command_payload), req.body.priority || 'normal']
        );
        const cmd = await get(`SELECT * FROM command_queue WHERE id = ?`, [result.lastID]);

        // Push notification to target device if phone provided
        if (effectivePhone) {
            const msgText = typeof command_payload === 'string' ? command_payload : (command_payload.message || JSON.stringify(command_payload));
            const isCritical = command_type === 'critical';
            const urgencyText = isCritical ? '🚨 CRITICAL TASK:' : '📢 COMMAND FROM HQ:';
            await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                [target_phone, 'direct_command', `${urgencyText} ${msgText}`, 1]);
        } else if (group_id) {
            // Target group
            const msgText = typeof command_payload === 'string' ? command_payload : (command_payload.message || JSON.stringify(command_payload));
            const isCritical = command_type === 'critical';
            const urgencyText = isCritical ? '🚨 CRITICAL GROUP TASK:' : '📢 GROUP COMMAND:';
            const members = await all(`SELECT u.device_id FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?`, [group_id]);
            for (const m of members) {
                if (m.device_id) {
                    await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                        [m.device_id, 'direct_command', `${urgencyText} ${msgText}`, 1]);
                }
            }
        }

        const wsPayload = { id: cmd.id, target_phone, group_id, command_type: command_type || 'direct', payload: command_payload };
        if (group_id) {
            const members = await all(`SELECT u.device_id, u.phone FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?`, [group_id]);
            for (const m of members) {
                if (m.device_id) socketManager.send(m.device_id, 'NEW_COMMAND', wsPayload);
                if (m.phone) socketManager.send(m.phone, 'NEW_COMMAND', wsPayload);
            }
            broadcast('NEW_COMMAND', wsPayload, 'admin');
        } else {
            await broadcastToAdminAndTarget('NEW_COMMAND', wsPayload, target_phone);
        }
        await logCommand('COMMAND_ISSUED', actor || 'Commander', target_phone || `Group ${group_id}`, command_payload);

        // TACTICAL SYNC: If this is a group/cluster mission, update all associated rescue requests
        let payloadObj = command_payload;
        if (typeof command_payload === 'string') {
            try { payloadObj = JSON.parse(command_payload); } catch(e) {}
        }

        if (command_type === 'group' && payloadObj && payloadObj.request_ids && Array.isArray(payloadObj.request_ids)) {
            const ids = payloadObj.request_ids;
            const placeholders = ids.map(() => '?').join(',');
            await run(`UPDATE rescue_requests SET status = 'assigned', assigned_group_id = ?, assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, 
                [group_id || null, target_user_id || null, ...ids]);
            
            if (target_user_id) {
                for (const reqId of ids) {
                    await run(`INSERT INTO sos_assignment_history (rescue_req_id, rescuer_id, action) VALUES (?, ?, 'assigned')`, [reqId, target_user_id]);
                }
            }

            // Cancel any previous individual commands for these requests to prevent duplicates
            for (const reqId of ids) {
                await run(`UPDATE command_queue SET status = 'cancelled' WHERE command_payload LIKE ? AND status NOT IN ('completed', 'cancelled', 'declined')`, [`%"rescue_req_id":${reqId}%`]);
                await run(`UPDATE command_queue SET status = 'cancelled' WHERE command_payload LIKE ? AND status NOT IN ('completed', 'cancelled', 'declined')`, [`%"rescue_req_id":"${reqId}"%`]);
            }
            
            // Notify clients to refresh
            broadcastToAdminAndTarget('RESCUE_REQUESTS_UPDATED', { ids, status: 'assigned', group_id, target_user_id }, target_user_id);
        } else if (payloadObj && payloadObj.rescue_req_id) {
            const reqId = payloadObj.rescue_req_id;
            await run(`UPDATE rescue_requests SET status = 'assigned', assigned_group_id = ?, assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [group_id || null, target_user_id || null, reqId]);
            if (target_user_id) {
                await run(`INSERT INTO sos_assignment_history (rescue_req_id, rescuer_id, action) VALUES (?, ?, 'assigned')`, [reqId, target_user_id]);
            }
            // Cancel any previous individual/group commands for this request to prevent duplicates
            await run(`UPDATE command_queue SET status = 'cancelled' WHERE id != ? AND (command_payload LIKE ? OR command_payload LIKE ?) AND status NOT IN ('completed', 'cancelled', 'declined')`, [cmd.id, `%"rescue_req_id":${reqId}%`, `%"rescue_req_id":"${reqId}"%`]);
            broadcastToAdminAndTarget('RESCUE_REQUESTS_UPDATED', { ids: [reqId], status: 'assigned', group_id, target_user_id }, target_user_id);
        }

        triggerBackup();
        res.json(cmd);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get rescue requests by phone (for Public App status polling)
app.get('/api/rescue-requests/by-phone/:phone', async (req, res) => {
    try {
        const p = req.params.phone;
        const reqs = await all(
            `SELECT * FROM rescue_requests WHERE device_id = ? OR (phone IS NOT NULL AND phone = ?) ORDER BY created_at DESC LIMIT 10`,
            [p, p]
        );
        res.json(reqs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Manage interrupted tasks
app.put('/api/users/:id/interrupted-task', async (req, res) => {
    const { task_id } = req.body;
    try {
        await run(`UPDATE users SET interrupted_task_id = ? WHERE id = ?`, [task_id || null, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:id/interrupted-task', async (req, res) => {
    try {
        const user = await get(`SELECT interrupted_task_id FROM users WHERE id = ?`, [req.params.id]);
        res.json({ interrupted_task_id: user?.interrupted_task_id || null });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Acknowledge command as processed
app.put('/api/commands/:id/acknowledge', async (req, res) => {
    try {
        await run(`UPDATE command_queue SET status = 'acknowledged', acknowledged_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);
        res.json({ message: 'Acknowledged' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update command status (accept, decline, complete)
app.put('/api/commands/:id/status', async (req, res) => {
    const { status, rescuer_phone, completion_image } = req.body;
    const validStatuses = ['pending', 'accepted', 'declined', 'completed', 'acknowledged', 'in_progress'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    try {
        let finalStatus = status;
        let cmdData = await get(`SELECT * FROM command_queue WHERE id = ?`, [req.params.id]);

        // Find the rescuer who is accepting or completing the task (robust match on phone/device_id)
        const rPhone = rescuer_phone;
        const cleanedPhone = (rPhone || '').replace(/\D/g, '').slice(-10);
        let rescuer = null;
        if (cleanedPhone) {
            rescuer = await get(`SELECT id, phone, device_id, name FROM users WHERE phone = ? OR device_id = ? OR id = ? OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ?`, [rPhone, rPhone, rPhone, `%${cleanedPhone}`]);
        } else {
            rescuer = await get(`SELECT id, phone, device_id, name FROM users WHERE phone = ? OR device_id = ? OR id = ?`, [rPhone, rPhone, rPhone]);
        }
        if (!cmdData) return res.status(404).json({ error: 'Command not found' });
        if (['ignored', 'cancelled', 'reassigned'].includes(cmdData.status) && status !== 'declined') {
            return res.status(403).json({ error: 'Command is no longer active or has been revoked.' });
        }
        if (rescuer && !cmdData.group_id) {
            const tpClean = (cmdData.target_phone || '').replace(/\D/g, '').slice(-10);
            const myClean = (rescuer.phone || '').replace(/\D/g, '').slice(-10);
            const isTarget = cmdData.target_phone === rescuer.phone || cmdData.target_phone === rescuer.device_id || String(cmdData.target_phone) === String(rescuer.id) || (tpClean && myClean && tpClean === myClean);
            if (!isTarget && status !== 'declined') {
                return res.status(403).json({ error: 'Task is no longer assigned to this rescuer.' });
            }
        }

        if (status === 'completed') {
            if (rescuer) {
                await run(`INSERT OR IGNORE INTO rescuer_command_completions (command_id, rescuer_id) VALUES (?, ?)`, [req.params.id, rescuer.id]);
                
                if (cmdData.group_id) {
                    const assignedRescuers = await all(`SELECT user_id FROM group_members WHERE group_id = ?`, [cmdData.group_id]);
                    const completedRescuers = await all(`SELECT rescuer_id FROM rescuer_command_completions WHERE command_id = ?`, [req.params.id]);
                    
                    if (completedRescuers.length < assignedRescuers.length) {
                        finalStatus = 'in_progress';
                    }
                }
            }
        }

        let compImageUrl = null;
        if (completion_image) {
            compImageUrl = saveCompletionImage(completion_image);
        }

        if (compImageUrl) {
            await run(`UPDATE command_queue SET status = ?, completion_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [finalStatus, compImageUrl, req.params.id]);
        } else {
            await run(`UPDATE command_queue SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [finalStatus, req.params.id]);
        }
        cmdData = await get(`SELECT * FROM command_queue WHERE id = ?`, [req.params.id]);

        if (finalStatus === 'completed' || finalStatus === 'declined' || finalStatus === 'finished') {
            await run(`UPDATE notifications SET read = 1 WHERE message LIKE ? OR message LIKE ?`, [`%${req.params.id}%`, `%${cmdData.desc}%`]);
            try {
                const payload = typeof cmdData.command_payload === 'string' ? JSON.parse(cmdData.command_payload) : cmdData.command_payload;
                if (payload) {
                    if (payload.rescue_req_id) {
                        await run(`UPDATE notifications SET read = 1 WHERE message LIKE ?`, [`%${payload.rescue_req_id}%`]);
                    }
                    if (payload.request_ids && Array.isArray(payload.request_ids)) {
                        for (const reqId of payload.request_ids) {
                            await run(`UPDATE notifications SET read = 1 WHERE message LIKE ?`, [`%${reqId}%`]);
                        }
                    }
                }
            } catch (e) {}
        }

        // Propagation: If this command is linked to rescue_requests (single or grouped), update them too
        try {
            const payload = typeof cmdData.command_payload === 'string' ? JSON.parse(cmdData.command_payload) : cmdData.command_payload;
            if (payload) {
                // Case 1: Single rescue request
                if (payload.rescue_req_id) {
                    let reqFinalStatus = finalStatus;
                    let descAppend = '';
                    let setAssignedNull = false;
                    let broadcastEvent = 'RESCUE_REQUEST_UPDATE';
                    if (status === 'declined') {
                        reqFinalStatus = 'pending';
                        descAppend = `\n[Declined by Rescuer ID: ${rescuer ? rescuer.id : 'Unknown'}]`;
                        setAssignedNull = true;
                        broadcastEvent = 'RESCUE_REQUEST_DECLINED_REASSIGN';
                    }

                    if (['accepted', 'in_progress', 'completed'].includes(status) && rescuer) {
                        if (compImageUrl) {
                            await run(`UPDATE rescue_requests SET status = ?, completion_image_url = ?, assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [reqFinalStatus, compImageUrl, rescuer.id, payload.rescue_req_id]);
                        } else {
                            await run(`UPDATE rescue_requests SET status = ?, assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [reqFinalStatus, rescuer.id, payload.rescue_req_id]);
                        }
                    } else {
                        if (setAssignedNull) {
                            if (compImageUrl) {
                                await run(`UPDATE rescue_requests SET status = ?, completion_image_url = ?, assigned_user_id = NULL, details = coalesce(details, '') || ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [reqFinalStatus, compImageUrl, descAppend, payload.rescue_req_id]);
                            } else {
                                await run(`UPDATE rescue_requests SET status = ?, assigned_user_id = NULL, details = coalesce(details, '') || ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [reqFinalStatus, descAppend, payload.rescue_req_id]);
                            }
                        } else {
                            if (compImageUrl) {
                                await run(`UPDATE rescue_requests SET status = ?, completion_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [reqFinalStatus, compImageUrl, payload.rescue_req_id]);
                            } else {
                                await run(`UPDATE rescue_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [reqFinalStatus, payload.rescue_req_id]);
                            }
                        }
                    }
                    
                    // AUDIT TRAIL LOGGING
                    if (rescuer) {
                        await run(`INSERT INTO sos_assignment_history (rescue_req_id, rescuer_id, action) VALUES (?, ?, ?)`, [payload.rescue_req_id, rescuer.id, status]);
                        if (status === 'completed') {
                            await run(`INSERT INTO sos_completion_log (rescue_req_id, completed_by_rescuer_id, evidence_url) VALUES (?, ?, ?)`, [payload.rescue_req_id, rescuer.id, compImageUrl || null]);
                        }
                    }
                    if (status === 'declined') {
                        await run(`INSERT INTO sos_assignment_history (rescue_req_id, action) VALUES (?, 'returned_to_pending')`, [payload.rescue_req_id]);
                    }
                    const reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [payload.rescue_req_id]);
                    if (reqData) broadcastToAdminAndTarget(broadcastEvent, reqData, reqData.assigned_user_id);
                }
                // Case 2: Grouped rescue requests
                if (payload.request_ids && Array.isArray(payload.request_ids) && payload.request_ids.length > 0) {
                    const ids = payload.request_ids;
                    const placeholders = ids.map(() => '?').join(',');

                    let reqFinalStatus = finalStatus;
                    let descAppend = '';
                    let setAssignedNull = false;
                    let broadcastEvent = 'RESCUE_REQUEST_UPDATE';
                    if (status === 'declined') {
                        reqFinalStatus = 'pending';
                        descAppend = `\n[Declined by Rescuer ID: ${rescuer ? rescuer.id : 'Unknown'}]`;
                        setAssignedNull = true;
                        broadcastEvent = 'RESCUE_REQUEST_DECLINED_REASSIGN';
                    }

                    if (['accepted', 'in_progress', 'completed'].includes(status) && rescuer) {
                        if (compImageUrl) {
                            await run(`UPDATE rescue_requests SET status = ?, completion_image_url = ?, assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, [reqFinalStatus, compImageUrl, rescuer.id, ...ids]);
                        } else {
                            await run(`UPDATE rescue_requests SET status = ?, assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, [reqFinalStatus, rescuer.id, ...ids]);
                        }
                    } else {
                        if (setAssignedNull) {
                            if (compImageUrl) {
                                await run(`UPDATE rescue_requests SET status = ?, completion_image_url = ?, assigned_user_id = NULL, details = coalesce(details, '') || ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, [reqFinalStatus, compImageUrl, descAppend, ...ids]);
                            } else {
                                await run(`UPDATE rescue_requests SET status = ?, assigned_user_id = NULL, details = coalesce(details, '') || ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, [reqFinalStatus, descAppend, ...ids]);
                            }
                        } else {
                            if (compImageUrl) {
                                await run(`UPDATE rescue_requests SET status = ?, completion_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, [reqFinalStatus, compImageUrl, ...ids]);
                            } else {
                                await run(`UPDATE rescue_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`, [reqFinalStatus, ...ids]);
                            }
                        }
                    }
                    if (rescuer) {
                        for (const id of ids) {
                            await run(`INSERT INTO sos_assignment_history (rescue_req_id, rescuer_id, action) VALUES (?, ?, ?)`, [id, rescuer.id, status]);
                            if (status === 'completed') {
                                await run(`INSERT OR IGNORE INTO sos_completion_log (rescue_req_id, completed_by_rescuer_id, evidence_url) VALUES (?, ?, ?)`, [id, rescuer.id, compImageUrl || null]);
                            }
                        }
                    }
                    if (status === 'declined') {
                        for (const id of ids) {
                            await run(`INSERT INTO sos_assignment_history (rescue_req_id, action) VALUES (?, 'returned_to_pending')`, [id]);
                        }
                    }
                    for (const id of ids) {
                        const reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [id]);
                        if (reqData) broadcastToAdminAndTarget(broadcastEvent, reqData, reqData.assigned_user_id);
                    }
                }
            }
        } catch (e) { console.error("Propagation error", e); }

        broadcast('COMMAND_STATUS_UPDATE', cmdData);
        if (finalStatus === 'in_progress' && status === 'completed') {
            await logCommand('COMMAND_STATUS_UPDATE', rescuer_phone || 'Rescuer', `Command ID: ${req.params.id}`, { status: 'rescuer_completed_waiting' });
        } else {
            await logCommand('COMMAND_STATUS_UPDATE', rescuer_phone || 'Rescuer', `Command ID: ${req.params.id}`, { status: finalStatus });
        }

        triggerBackup();
        res.json(cmdData);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/commands/:id/location', async (req, res) => {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'Lat and Lng are required' });
    try {
        const cmd = await get(`SELECT * FROM command_queue WHERE id = ?`, [req.params.id]);
        if (!cmd) return res.status(404).json({ error: 'Command not found' });

        let payload = {};
        try {
            payload = typeof cmd.command_payload === 'string' ? JSON.parse(cmd.command_payload || '{}') : (cmd.command_payload || {});
        } catch(e) { console.error("JSON parse error in location:", e); }
        payload.lat = lat;
        payload.lng = lng;
        payload.coords = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        await run(`UPDATE command_queue SET command_payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [JSON.stringify(payload), req.params.id]);

        const updatedCmd = await get(`SELECT * FROM command_queue WHERE id = ?`, [req.params.id]);
        broadcast('COMMAND_LOCATION_UPDATED', updatedCmd);
        await logCommand('COMMAND_LOCATION_UPDATE', 'Admin', `Command ID: ${req.params.id}`, { lat, lng });
        triggerBackup();
        res.json(updatedCmd);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reassign an existing command
app.put('/api/commands/:id/reassign', async (req, res) => {
    const { target_phone, target_user_id, group_id } = req.body;
    let effectivePhone = target_phone;
    let effectiveGroupId = group_id;

    try {
        if (target_user_id && !effectivePhone) {
            const user = await get(`SELECT phone, device_id FROM users WHERE id = ?`, [target_user_id]);
            if (user) effectivePhone = user.phone || user.device_id;
        }

        const oldCmdData = await get(`SELECT * FROM command_queue WHERE id = ?`, [req.params.id]);
        let oldPayload = {};
        try { oldPayload = JSON.parse(oldCmdData.command_payload); } catch(e){}
        const reqId = oldPayload.rescue_req_id;
        let nextVersion = 1;
        if (reqId) {
            const reqObj = await get(`SELECT assignment_version FROM rescue_requests WHERE id = ?`, [reqId]);
            nextVersion = (reqObj ? reqObj.assignment_version || 0 : 0) + 1;
        }

        await run(`UPDATE command_queue SET target_phone = ?, group_id = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP, assignment_version = ?, assignment_timestamp = CURRENT_TIMESTAMP WHERE id = ?`, [effectivePhone || null, effectiveGroupId || null, nextVersion, req.params.id]);
        let cmdData = await get(`SELECT * FROM command_queue WHERE id = ?`, [req.params.id]);
        if (oldCmdData && oldCmdData.target_phone) {
            broadcastToAdminAndTarget('TASK_REVOKED', { task_id: reqId || req.params.id, old_rescuer_id: oldCmdData.target_phone, new_assignment_version: nextVersion }, oldCmdData.target_phone);
        }

        let payload = {};
        try {
            payload = typeof cmdData.command_payload === 'string' ? JSON.parse(cmdData.command_payload || '{}') : (cmdData.command_payload || {});
        } catch(e) { console.error("JSON parse error in reassign:", e); }
        payload.assignment_version = nextVersion;
        await run(`UPDATE command_queue SET command_payload = ? WHERE id = ?`, [JSON.stringify(payload), req.params.id]);
        cmdData.command_payload = JSON.stringify(payload);

        if (req.body.custom_polygon) {
            payload.custom_polygon = req.body.custom_polygon;
            await run(`UPDATE command_queue SET command_payload = ? WHERE id = ?`, [JSON.stringify(payload), req.params.id]);
            cmdData.command_payload = JSON.stringify(payload);
        }

        // TACTICAL SYNC: If this command is linked to rescue_requests, update them and log timeline events
        if (payload) {
            let reqIds = [];
            if (payload.rescue_req_id) {
                reqIds.push(payload.rescue_req_id);
            }
            if (payload.request_ids && Array.isArray(payload.request_ids)) {
                reqIds = reqIds.concat(payload.request_ids);
            }

            if (reqIds.length > 0) {
                const placeholders = reqIds.map(() => '?').join(',');
                let targetUserId = target_user_id;
                if (!targetUserId && effectivePhone) {
                    const u = await get(`SELECT id FROM users WHERE phone = ? OR device_id = ?`, [effectivePhone, effectivePhone]);
                    if (u) targetUserId = u.id;
                }

                // Log the return to pending since the previous rescuer declined/ignored/was reassigned from it
                for (const reqId of reqIds) {
                    await run(`INSERT INTO sos_assignment_history (rescue_req_id, action) VALUES (?, 'returned_to_pending')`, [reqId]);
                }

                // Update requests
                await run(`UPDATE rescue_requests SET status = 'assigned', assigned_group_id = ?, assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP, assignment_version = ?, assignment_timestamp = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
                    [effectiveGroupId || null, targetUserId || null, nextVersion, ...reqIds]);

                // Write new assignment to history
                if (targetUserId) {
                    for (const reqId of reqIds) {
                        await run(`INSERT INTO sos_assignment_history (rescue_req_id, rescuer_id, action) VALUES (?, ?, 'assigned')`, [reqId, targetUserId]);
                    }
                }
                
                broadcastToAdminAndTarget('RESCUE_REQUESTS_UPDATED', { ids: reqIds, status: 'assigned', group_id: effectiveGroupId, target_user_id: targetUserId }, targetUserId);
            }
        }

        // Notify new target
        const msgText = payload.message || 'You have been reassigned a task.';

        if (effectivePhone) {
            await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                [effectivePhone, 'direct_command', `🔄 REASSIGNED: ${msgText}`, 1]);
        } else if (effectiveGroupId) {
            const members = await all(`SELECT u.device_id, u.phone FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?`, [effectiveGroupId]);
            for (const m of members) {
                const target = m.phone || m.device_id;
                if (target) {
                    await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                        [target, 'direct_command', `🔄 REASSIGNED GROUP TASK: ${msgText}`, 1]);
                }
            }
        }

        broadcast('COMMAND_REASSIGNED', cmdData);
        await logCommand('COMMAND_REASSIGNED', 'Commander', `Command ID: ${req.params.id}`, { target_phone, group_id });
        triggerBackup();
        res.json(cmdData);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const [sosCount, sosCompleted, foodCount, foodCompleted, medCount, medCompleted] = await Promise.all([
            get(`SELECT COUNT(*) as count FROM rescue_requests WHERE type IN ('sos', 'medical', 'pregnancy') AND status != 'completed'`),
            get(`SELECT COUNT(*) as count FROM rescue_requests WHERE type IN ('sos', 'medical', 'pregnancy') AND status = 'completed'`),
            get(`SELECT COUNT(*) as count FROM rescue_requests WHERE type IN ('food', 'delivery') AND status != 'completed'`),
            get(`SELECT COUNT(*) as count FROM rescue_requests WHERE type IN ('food', 'delivery') AND status = 'completed'`),
            get(`SELECT COUNT(*) as count FROM rescue_requests WHERE type IN ('medical', 'medical_delivery') AND status != 'completed'`),
            get(`SELECT COUNT(*) as count FROM rescue_requests WHERE type IN ('medical', 'medical_delivery') AND status = 'completed'`),
        ]);

        // Simulating some ongoing/completed stats based on data
        res.json({
            sos: { ongoing: sosCount.count || 0, completed: sosCompleted.count || 0, total: (sosCount.count || 0) + (sosCompleted.count || 0) },
            food: { ongoing: foodCount.count || 0, completed: foodCompleted.count || 0, total: (foodCount.count || 0) + (foodCompleted.count || 0) },
            medical: { ongoing: medCount.count || 0, completed: medCompleted.count || 0, total: (medCount.count || 0) + (medCompleted.count || 0) }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Command Log ─────────────────────────────────────────────────────────────
app.get('/api/command-log', async (req, res) => {
    try { res.json(await all(`SELECT * FROM command_log ORDER BY timestamp DESC LIMIT 500`)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Notifications ────────────────────────────────────────────────────────────
app.get('/api/notifications', async (req, res) => {
    const { device_id } = req.query;
    try {
        const rows = device_id
            ? await all(`SELECT * FROM notifications WHERE device_id = ? ORDER BY created_at DESC`, [device_id])
            : await all(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 200`);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notifications/action', async (req, res) => {
    const { notification_id, action } = req.body;
    try {
        await run(`UPDATE notifications SET action_taken = ?, read = 1 WHERE id = ?`, [action, notification_id]);
        const n = await get(`SELECT * FROM notifications WHERE id = ?`, [notification_id]);
        broadcast('NOTIFICATION_ACTION', { notification_id, action, device_id: n?.device_id });
        res.json({ message: 'Action recorded' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Settings ─────────────────────────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
    try {
        const rows = await all(`SELECT * FROM settings`);
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
    const { key, value } = req.body;
    try {
        await run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, String(value)]);
        broadcast('SETTINGS_UPDATED', { key, value });
        if (key === 'sos_buffer_minutes') {
            broadcast('BUFFER_TIME_UPDATE', { minutes: parseInt(value) || 15 });
        }
        if (key === 'ai_interval_val' || key === 'ai_interval_unit' || key === 'ai_enabled') {
            startAITimer();
        }

        res.json({ message: 'Setting updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Excel Export ─────────────────────────────────────────────────────────────
app.get('/api/export/log', async (req, res) => {
    try {
        const logs = await all(`SELECT * FROM command_log ORDER BY timestamp ASC`);
        const sos = await all(`SELECT * FROM sos_alerts ORDER BY timestamp ASC`);

        let csv = '=== COMMAND LOG ===\r\nID,Action,Actor,Target,Details,Timestamp\r\n';
        logs.forEach(l => {
            csv += `${l.id},"${l.action}","${l.actor}","${l.target || ''}","${(l.details || '').replace(/"/g, "''")}","${l.timestamp}"\r\n`;
        });
        csv += '\r\n=== SOS ALERTS ===\r\nID,Device ID,Latitude,Longitude,Priority,Status,Timestamp\r\n';
        sos.forEach(s => {
            csv += `${s.id},"${s.device_id}",${s.lat},${s.lng},${s.is_priority || 0},"${s.status}","${s.timestamp}"\r\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="rescue_log.csv"');
        res.send(csv);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = 3001;

// ─── AI Engine ────────────────────────────────────────────────────────────────
app.get('/api/ai/status', async (req, res) => {
    try {
        const setting = await get(`SELECT value FROM settings WHERE key = 'ai_enabled'`);
        res.json({ enabled: setting && setting.value === 'true' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/toggle', async (req, res) => {
    const { enabled } = req.body;
    try {
        await run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_enabled', ?)`, [enabled ? 'true' : 'false']);
        if (enabled) {
            runAIAssignment();
            startAITimer();
        } else {
            stopAITimer();
        }
        res.json({ success: true, enabled });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ai/interval', async (req, res) => {
    try {
        const valSet = await get(`SELECT value FROM settings WHERE key = 'ai_interval_val'`);
        const unitSet = await get(`SELECT value FROM settings WHERE key = 'ai_interval_unit'`);
        res.json({ 
            value: valSet ? parseInt(valSet.value) : 5, 
            unit: unitSet ? unitSet.value : 'Minutes' 
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/interval', async (req, res) => {
    const { value, unit } = req.body;
    try {
        await run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_interval_val', ?)`, [String(value)]);
        await run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_interval_unit', ?)`, [String(unit)]);
        const setting = await get(`SELECT value FROM settings WHERE key = 'ai_enabled'`);
        if (setting && setting.value === 'true') {
            startAITimer(); // restart timer with new interval
        }
        res.json({ success: true, value, unit });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ai/reassign-interval', async (req, res) => {
    try {
        const valSet = await get(`SELECT value FROM settings WHERE key = 'ai_reassign_interval_val'`);
        const unitSet = await get(`SELECT value FROM settings WHERE key = 'ai_reassign_interval_unit'`);
        res.json({ 
            value: valSet ? parseInt(valSet.value) : 10, 
            unit: unitSet ? unitSet.value : 'Seconds' 
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/reassign-interval', async (req, res) => {
    const { value, unit } = req.body;
    try {
        await run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_reassign_interval_val', ?)`, [String(value)]);
        await run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_reassign_interval_unit', ?)`, [String(unit)]);
        res.json({ success: true, value, unit });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

let aiIntervalTimer = null;
function stopAITimer() {
    if (aiIntervalTimer) {
        clearInterval(aiIntervalTimer);
        aiIntervalTimer = null;
    }
}
async function startAITimer() {
    stopAITimer();
    try {
        const valSet = await get(`SELECT value FROM settings WHERE key = 'ai_interval_val'`);
        const unitSet = await get(`SELECT value FROM settings WHERE key = 'ai_interval_unit'`);
        const val = valSet ? parseInt(valSet.value) : 5;
        const unit = unitSet ? unitSet.value : 'Minutes';
        
        let ms = 5 * 60 * 1000;
        if (unit === 'Seconds') ms = val * 1000;
        if (unit === 'Minutes') ms = val * 60 * 1000;
        if (unit === 'Hours') ms = val * 60 * 60 * 1000;

        aiIntervalTimer = setInterval(runAIAssignment, ms);
    } catch (e) { console.error('Failed to start AI Timer', e); }
}

// Start on boot if enabled
setTimeout(async () => {
    try {
        const setting = await get(`SELECT value FROM settings WHERE key = 'ai_enabled'`);
        if (setting && setting.value === 'true') startAITimer();
    } catch(e) {}
}, 2000);

async function runAIAssignment() {
    try {
        const setting = await get(`SELECT value FROM settings WHERE key = 'ai_enabled'`);
        if (!setting || setting.value !== 'true') return;

        // ─── DATABASE INTEGRITY RECONCILIATION ────────────────────────────────────
        // Auto-detect and resolve any "dangling assigned" rescue requests that have no active command queue items.
        const assignedReqs = await all(`SELECT id FROM rescue_requests WHERE status = 'assigned'`);
        for (const req of assignedReqs) {
            const activeCmd = await get(`
                SELECT id FROM command_queue 
                WHERE status IN ('assigned', 'pending', 'accepted', 'in_progress')
                AND (command_payload LIKE '%"rescue_req_id":' || ? || '%' OR command_payload LIKE '%"rescue_req_id":"' || ? || '"%')
            `, [req.id, req.id]);
            
            if (!activeCmd) {
                console.log(`[Reconciliation] Found dangling assigned rescue request #${req.id}. Resetting to pending.`);
                await run(`UPDATE rescue_requests SET status = 'pending', assigned_user_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.id]);
                await run(`INSERT INTO sos_assignment_history (rescue_req_id, action) VALUES (?, 'returned_to_pending')`, [req.id]);
            }
        }
        // ──────────────────────────────────────────────────────────────────────────

        const valSet = await get(`SELECT value FROM settings WHERE key = 'ai_interval_val'`);
        const unitSet = await get(`SELECT value FROM settings WHERE key = 'ai_interval_unit'`);
        const val = valSet ? parseInt(valSet.value) || 5 : 5;
        const unit = unitSet ? unitSet.value : 'Seconds';
        
        let bufferSecs = 5;
        if (unit === 'Seconds') bufferSecs = val;
        if (unit === 'Minutes') bufferSecs = val * 60;
        if (unit === 'Hours') bufferSecs = val * 3600;

        // ─── TIMEOUT LOGIC (Rescuer Ignored SOS) ──────────────────────────────────
        const reValSet = await get(`SELECT value FROM settings WHERE key = 'ai_reassign_interval_val'`);
        const reUnitSet = await get(`SELECT value FROM settings WHERE key = 'ai_reassign_interval_unit'`);
        const reVal = reValSet ? parseInt(reValSet.value) || 10 : 10;
        const reUnit = reUnitSet ? reUnitSet.value : 'Seconds';
        
        let timeoutSeconds = 10; // Configurable timeout for rescuer response
        if (reUnit === 'Seconds') timeoutSeconds = reVal;
        if (reUnit === 'Minutes') timeoutSeconds = reVal * 60;
        if (reUnit === 'Hours') timeoutSeconds = reVal * 3600;

        const timedOutCommands = await all(`
            SELECT cq.*, rr.id as req_id, rr.details as req_details
            FROM command_queue cq
            JOIN rescue_requests rr ON cq.command_payload LIKE '%"rescue_req_id":' || rr.id || '%' OR cq.command_payload LIKE '%"rescue_req_id":"' || rr.id || '"%'
            WHERE cq.status = 'assigned' AND cq.assigned_by = 'AI'
            AND (strftime('%s', 'now') - strftime('%s', COALESCE(cq.updated_at, cq.created_at))) >= ?
            AND rr.status = 'assigned'
        `, [timeoutSeconds]);

        for (const cmd of timedOutCommands) {
            const rescuerPhone = cmd.target_phone;
            const rescuer = await get(`SELECT id FROM users WHERE phone = ? OR device_id = ?`, [rescuerPhone, rescuerPhone]);
            const rescuerId = rescuer ? rescuer.id : 'Unknown';
            const descAppend = `\n[Ignored by Rescuer ID: ${rescuerId}]`;
            
            // Ensure we don't append it repeatedly
            if (!(cmd.req_details || '').includes(`[Ignored by Rescuer ID: ${rescuerId}]`)) {
                const reqObj = await get(`SELECT assignment_version FROM rescue_requests WHERE id = ?`, [cmd.req_id]);
                const nextVersion = (reqObj ? reqObj.assignment_version || 0 : 0) + 1;

                await run(`UPDATE rescue_requests SET status = 'pending', assigned_user_id = NULL, details = coalesce(details, '') || ?, updated_at = CURRENT_TIMESTAMP, assignment_version = ?, assignment_timestamp = CURRENT_TIMESTAMP WHERE id = ?`, [descAppend, nextVersion, cmd.req_id]);
                await run(`UPDATE command_queue SET status = 'ignored', updated_at = CURRENT_TIMESTAMP, assignment_version = ?, assignment_timestamp = CURRENT_TIMESTAMP WHERE id = ?`, [nextVersion, cmd.id]);
                await run(`INSERT INTO sos_assignment_history (rescue_req_id, rescuer_id, action) VALUES (?, ?, 'ignored')`, [cmd.req_id, rescuer ? rescuer.id : null]);
                await run(`INSERT INTO sos_assignment_history (rescue_req_id, action) VALUES (?, 'returned_to_pending')`, [cmd.req_id]);
                
                broadcastToAdminAndTarget('RESCUE_REQUEST_IGNORED_REASSIGN', { rescue_req_id: cmd.req_id, command_id: cmd.id, rescuerId, message: `Rescuer ignored assignment (Timeout). AI is finding next eligible unit.`, assignment_version: nextVersion }, rescuerId);
                broadcastToAdminAndTarget('TASK_REVOKED', { task_id: cmd.req_id, command_id: cmd.id, old_rescuer_id: rescuerId, new_assignment_version: nextVersion }, rescuerId);
                await logCommand('AI_TIMEOUT_REASSIGN', 'System Engine', `Task ${cmd.id} ignored by ${rescuerId}`, { reqId: cmd.req_id });
            }
        }
        // ──────────────────────────────────────────────────────────────────────────

        // Fetch only pending requests that have existed longer than the buffer duration
        const pendingRequests = await all(`SELECT * FROM rescue_requests WHERE (status = 'pending' OR status = 'partially_declined') AND (strftime('%s', 'now') - strftime('%s', created_at)) >= ? ORDER BY id ASC`, [bufferSecs]);
        if (pendingRequests.length === 0) return;

        // Fetch AI Managed Users who are active, online, or recently updated location
        const aiUsers = await all(`
            SELECT DISTINCT u.* FROM users u
            LEFT JOIN rescuer_locations rl ON u.device_id = rl.device_id OR u.phone = rl.device_id
            WHERE (u.ai_managed = 1 OR u.ai_controlled = 1)
            AND u.is_available = 1 
            AND u.status != 'busy' 
            AND u.status != 'suspended'
            AND (
                u.status = 'online' 
                OR u.is_online = 1 
                OR (rl.last_updated IS NOT NULL AND (strftime('%s', 'now') - strftime('%s', rl.last_updated)) < 300)
            )
        `);
        if (aiUsers.length === 0) return;

        // Get latest rescuer locations
        const locations = await all(`SELECT * FROM rescuer_locations`);

        // Check for busy rescuers (those with ongoing or incomplete tasks)
        const activeTasks = await all(`SELECT assigned_user_id FROM rescue_requests WHERE status NOT IN ('completed', 'declined', 'finished', 'ignored') AND assigned_user_id IS NOT NULL`);
        const busyUserIds = new Set(activeTasks.map(t => t.assigned_user_id));

        for (const req of pendingRequests) {

            const historyRows = await all(`SELECT DISTINCT rescuer_id FROM sos_assignment_history WHERE rescue_req_id = ? AND action IN ('ignored', 'declined')`, [req.id]);
            const attemptedRescuers = new Set(historyRows.map(r => r.rescuer_id));

            let eligibleUsers = [];

            // Sequential Assignment Logic & Smart GPS Assignment
            for (const user of aiUsers) {
                // 1. Skip if rescuer already has an ongoing or incomplete assignment
                if (busyUserIds.has(user.id)) continue;

                // 1.5. Skip if rescuer has already declined or ignored this task
                if (attemptedRescuers.has(user.id)) continue;
                if (req.details && (req.details.includes(`[Declined by Rescuer ID: ${user.id}]`) || req.details.includes(`[Ignored by Rescuer ID: ${user.id}]`))) continue;

                // 2. Find location (Prioritize logged-in/available rescuers)
                const loc = locations.find(l => l.device_id === user.device_id || l.device_id === user.phone);
                
                let dist = Infinity;
                if (loc && loc.lat && loc.lng && req.lat && req.lng) {
                    dist = getDistance(req.lat, req.lng, loc.lat, loc.lng);
                }

                eligibleUsers.push({ user, dist });
            }

            // Sort by distance ascending
            eligibleUsers.sort((a, b) => a.dist - b.dist);

            let assignedUsers = [];
            if (eligibleUsers.length > 0) {
                // Find rescuers within 50 meters (0.05 KM)
                const nearUsers = eligibleUsers.filter(u => u.dist <= 0.05);
                if (nearUsers.length > 0) {
                    assignedUsers = nearUsers.map(u => u.user);
                } else {
                    // Fallback to the single nearest rescuer
                    assignedUsers = [eligibleUsers[0].user];
                }
            }

            if (assignedUsers.length === 0) {
                if (req.details && (req.details.includes('[Declined by Rescuer ID:') || req.details.includes('[Ignored by Rescuer ID:'))) {
                    // All available AI rescuers declined this task! Alert the Admin Web
                    if (!req.details.includes('[AI_ROTATION_COMPLETED]')) {
                        const descAppend = `\n[AI_ROTATION_COMPLETED]`;
                        await run(`UPDATE rescue_requests SET status = 'pending', details = coalesce(details, '') || ? WHERE id = ?`, [descAppend, req.id]);
                        await logCommand('AI_ROTATION_COMPLETED', 'System Engine', `All AI rescuers skipped Task #${req.id}`, { reqId: req.id });
                        broadcastToAdminAndTarget('RESCUER_DECLINED_LAST', req, req.assigned_user_id);
                    }
                }
                continue;
            }

            for (const bestUser of assignedUsers) {
                const assignedUserId = bestUser.id;
                const assignedName = bestUser.name;
                const assignedPhone = bestUser.phone || bestUser.device_id || bestUser.id.toString();

                const nextVersion = (req.assignment_version || 0) + 1;

                // Atomic Check: Ensure it wasn't manually handled during buffer (allow status = 'assigned' for concurrent near matches)
                const updateRes = await run(`UPDATE rescue_requests SET status = 'assigned', assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP, assignment_version = ?, assignment_timestamp = CURRENT_TIMESTAMP WHERE id = ? AND (status = 'pending' OR status = 'partially_declined' OR status = 'assigned')`,
                    [assignedUserId, nextVersion, req.id]);

                if (updateRes.changes === 0) {
                    continue; // Skip: Another admin manually handled it while buffer was running!
                }

                await run(`INSERT INTO sos_assignment_history (rescue_req_id, rescuer_id, action) VALUES (?, ?, 'assigned')`, [req.id, assignedUserId]);

                // Mark them as busy for subsequent requests in this loop
                busyUserIds.add(assignedUserId);

                let commandType = req.priority || 'critical';
                if (!req.priority || req.priority === 'normal') {
                    const lowType = (req.type || '').toLowerCase();
                    if (['food', 'delivery', 'supply', 'medical_delivery'].some(t => lowType.includes(t))) {
                        commandType = 'normal';
                    } else if (req.urgency === 'low' || req.urgency === 'medium') {
                        commandType = 'normal';
                    } else {
                        commandType = 'critical';
                    }
                }
                const safeTypeStr = (req.type || 'Request').toUpperCase();
                const cmdPayload = JSON.stringify({
                    message: `AI ASSIGNED: ${safeTypeStr} at ${req.sector || 'Unknown'}`,
                    sector: req.sector || 'Unknown',
                    lat: req.lat || 0,
                    lng: req.lng || 0,
                    urgency: req.urgency || 'high',
                    rescue_req_id: req.id,
                    requester_name: req.name || 'Citizen',
                    requester_phone: req.phone || 'Unknown',
                    details: req.details || '',
                    assigned_by: 'AI',
                    assignment_version: nextVersion
                });

                // ─── DUPLICATE PREVENTION: UPSERT COMMAND QUEUE FOR THIS SPECIFIC TARGET ───
                const existingCommand = await get(`SELECT * FROM command_queue WHERE (command_payload LIKE ? OR command_payload LIKE ?) AND target_phone = ?`, [`%"rescue_req_id":${req.id}%`, `%"rescue_req_id":"${req.id}"%`, assignedPhone]);
                
                if (existingCommand) {
                    await run(`UPDATE command_queue SET target_phone = ?, command_payload = ?, status = 'assigned', priority = ?, assigned_by = 'AI', updated_at = CURRENT_TIMESTAMP, assignment_version = ?, assignment_timestamp = CURRENT_TIMESTAMP WHERE id = ?`,
                        [assignedPhone, cmdPayload, commandType, nextVersion, existingCommand.id]);
                    await run(`UPDATE rescue_requests SET assigned_user_id = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP, assignment_version = ?, assignment_timestamp = CURRENT_TIMESTAMP WHERE id = ?`, [assignedUserId, nextVersion, req.id]);
                    const updatedCmdData = await get(`SELECT * FROM command_queue WHERE id = ?`, [existingCommand.id]);
                    broadcastToAdminAndTarget('NEW_COMMAND', updatedCmdData, bestUser.device_id); // Target specifically
                } else {
                    await run(`INSERT INTO command_queue (target_phone, command_type, command_payload, status, priority, assigned_by, assignment_version, assignment_timestamp) VALUES (?, ?, ?, 'assigned', ?, 'AI', ?, CURRENT_TIMESTAMP)`,
                        [assignedPhone, commandType, cmdPayload, commandType, nextVersion]);
                    const newCmdId = await get('SELECT last_insert_rowid() as id');
                    if (newCmdId) {
                        await run(`UPDATE rescue_requests SET assigned_user_id = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP, assignment_version = ?, assignment_timestamp = CURRENT_TIMESTAMP WHERE id = ?`, [assignedUserId, nextVersion, req.id]);
                        const newCmdData = await get(`SELECT * FROM command_queue WHERE id = ?`, [newCmdId.id]);
                        broadcastToAdminAndTarget('NEW_COMMAND', newCmdData, bestUser.device_id);
                    }
                }
                // ───────────────────────────────────────────────────────────────

                // Notify public user
                if (req.device_id) {
                    await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                        [req.device_id, 'rescue_dispatched', `Update: ${assignedName} has been automatically assigned to your request by the AI Engine.`, 0]);
                }

                // Notify the assigned rescuer
                await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                    [assignedPhone, 'new_task', `AI Engine assigned a new ${safeTypeStr} task to you. Distance: ${shortestDistance === Infinity ? 'Unknown' : shortestDistance.toFixed(1) + ' km'}.`, 1]);

                broadcastToAdminAndTarget('AI_ASSIGNED', { message: `Task ID #${req.id} auto-assigned by AI to ${assignedName}`, rescue_req_id: req.id, assignedName }, bestUser.device_id);
                await logCommand('AI_AUTO_ASSIGNED', 'System Engine', `Request ID: ${req.id}`, { assigned_user_id: assignedUserId, distance_km: shortestDistance === Infinity ? 'unknown' : shortestDistance.toFixed(2) });
            }
        }
        triggerBackup();
    } catch (e) {
        console.error("AI Assignment Error:", e);
    }
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Rescue Backend running on http://0.0.0.0:${PORT}`);
    triggerBackup();
});
