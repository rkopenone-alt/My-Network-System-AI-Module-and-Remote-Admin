import re

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add DB Schema Alters
schema_alters = """    db.run(`ALTER TABLE rescue_requests ADD COLUMN completion_image_url TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE command_queue ADD COLUMN completion_image_url TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE groups ADD COLUMN ai_managed INTEGER DEFAULT 0`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE users ADD COLUMN ai_managed INTEGER DEFAULT 0`, (err) => { /* ignore */ });"""

content = content.replace(
    """    db.run(`ALTER TABLE rescue_requests ADD COLUMN completion_image_url TEXT`, (err) => { /* ignore */ });
    db.run(`ALTER TABLE command_queue ADD COLUMN completion_image_url TEXT`, (err) => { /* ignore */ });""",
    schema_alters
)

# 2. Update /api/groups POST
content = content.replace(
    "const { group_name, role_type, description } = req.body;",
    "const { group_name, role_type, description, ai_managed } = req.body;"
)
content = content.replace(
    "INSERT INTO groups (group_name, role_type, description) VALUES (?, ?, ?)",
    "INSERT INTO groups (group_name, role_type, description, ai_managed) VALUES (?, ?, ?, ?)"
)
content = content.replace(
    "[group_name, role_type, description]",
    "[group_name, role_type, description, ai_managed ? 1 : 0]"
)

# 3. Update /api/groups PUT
content = content.replace(
    "UPDATE groups SET group_name = ?, role_type = ?, description = ? WHERE id = ?",
    "UPDATE groups SET group_name = ?, role_type = ?, description = ?, ai_managed = ? WHERE id = ?"
)
content = content.replace(
    "[group_name, role_type, description, req.params.id]",
    "[group_name, role_type, description, ai_managed ? 1 : 0, req.params.id]"
)

# 4. Update /api/users POST
content = content.replace(
    "const { name, role, phone, device_id, group_ids, photo_url, password, serial_number } = req.body;",
    "const { name, role, phone, device_id, group_ids, photo_url, password, serial_number, ai_managed } = req.body;"
)
content = content.replace(
    "INSERT INTO users (name, role, phone, device_id, photo_url, password, serial_number) VALUES (?, ?, ?, ?, ?, ?, ?)",
    "INSERT INTO users (name, role, phone, device_id, photo_url, password, serial_number, ai_managed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
)
content = content.replace(
    "[name, role, phone, device_id, photo_url, password, serial_number]",
    "[name, role, phone, device_id, photo_url, password, serial_number, ai_managed ? 1 : 0]"
)

# 5. Update /api/users PUT
content = content.replace(
    "const { name, role, phone, device_id, status, group_ids, photo_url, password, serial_number } = req.body;",
    "const { name, role, phone, device_id, status, group_ids, photo_url, password, serial_number, ai_managed } = req.body;"
)
content = content.replace(
    "UPDATE users SET name = ?, role = ?, phone = ?, device_id = ?, status = ?, photo_url = ?, password = ?, serial_number = ? WHERE id = ?",
    "UPDATE users SET name = ?, role = ?, phone = ?, device_id = ?, status = ?, photo_url = ?, password = ?, serial_number = ?, ai_managed = ? WHERE id = ?"
)
content = content.replace(
    "[name, role, phone, device_id, status, photo_url, password, serial_number, userId]",
    "[name, role, phone, device_id, status, photo_url, password, serial_number, ai_managed ? 1 : 0, userId]"
)

# 6. Add /api/ai/status and /api/ai/toggle and runAIAssignment
ai_logic = """
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
        }
        res.json({ success: true, enabled });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

async function runAIAssignment() {
    try {
        const setting = await get(`SELECT value FROM settings WHERE key = 'ai_enabled'`);
        if (!setting || setting.value !== 'true') return;

        const pendingRequests = await all(`SELECT * FROM rescue_requests WHERE status = 'pending'`);
        if (pendingRequests.length === 0) return;

        // Fetch AI Managed Groups & Users
        const aiGroups = await all(`SELECT * FROM groups WHERE ai_managed = 1`);
        const aiUsers = await all(`SELECT * FROM users WHERE ai_managed = 1 AND status = 'active'`);
        
        if (aiGroups.length === 0 && aiUsers.length === 0) return;

        for (const req of pendingRequests) {
            // Very simple heuristic: assign to the first AI Managed Group, or User.
            // In a real system, this would evaluate distance, role_type, workload.
            let assignedGroupId = null;
            let assignedUserId = null;
            let assignedName = 'AI Router';
            let assignedPhone = null;

            if (aiGroups.length > 0) {
                // Try to match operation_type to role_type or just pick the first
                const match = aiGroups.find(g => (g.role_type || '').toLowerCase().includes((req.type || '').toLowerCase())) || aiGroups[0];
                assignedGroupId = match.id;
                assignedName = match.group_name;
            } else if (aiUsers.length > 0) {
                assignedUserId = aiUsers[0].id;
                assignedName = aiUsers[0].name;
                assignedPhone = aiUsers[0].phone || aiUsers[0].device_id;
            }

            // Execute Assignment
            if (assignedGroupId || assignedUserId) {
                await run(`UPDATE rescue_requests SET status = 'assigned', assigned_group_id = ?, assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [assignedGroupId, assignedUserId, req.id]);

                let commandType = req.priority || 'critical';
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
                    details: req.details || ''
                });

                await run(`INSERT INTO command_queue (group_id, target_phone, command_type, command_payload, status, priority) VALUES (?, ?, ?, ?, 'assigned', ?)`,
                    [assignedGroupId, assignedPhone, commandType, cmdPayload, commandType]);

                if (req.device_id) {
                    await run(`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)`,
                        [req.device_id, 'rescue_dispatched', `Update: ${assignedName} has been automatically assigned to your request by the AI Engine.`, 0]);
                }

                broadcast('RESCUE_REQUEST_ACCEPTED', { ...req, assignedName, priority: commandType });
                await logCommand('AI_AUTO_ASSIGNED', 'System Engine', `Request ID: ${req.id}`, { assigned_group_id: assignedGroupId, assigned_user_id: assignedUserId });
            }
        }
        triggerBackup();
    } catch (e) {
        console.error("AI Assignment Error:", e);
    }
}

server.listen(PORT, '0.0.0.0', () => {"""

content = content.replace("server.listen(PORT, '0.0.0.0', () => {", ai_logic)

with open('system-backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patch successful!")
