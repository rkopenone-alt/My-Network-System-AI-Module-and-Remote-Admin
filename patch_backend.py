import os

path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\system-backend\server.js"
with open(path, "r", encoding="utf8") as f:
    data = f.read()

# 1. Update PUT /api/commands/:id/status descAppend logic for exact rescuer ID matching
old_cmd_status_1 = """                    if (status === 'declined') {
                        reqFinalStatus = 'pending';
                        descAppend = `\\n[Declined by Rescuer ${rescuer_phone || 'Unknown'}]`;
                        setAssignedNull = true;
                        broadcastEvent = 'NEW_RESCUE_REQUEST';
                    }"""
new_cmd_status_1 = """                    if (status === 'declined') {
                        reqFinalStatus = 'pending';
                        descAppend = `\\n[Declined by Rescuer ID: ${rescuer ? rescuer.id : 'Unknown'}]`;
                        setAssignedNull = true;
                        broadcastEvent = 'NEW_RESCUE_REQUEST';
                    }"""
data = data.replace(old_cmd_status_1, new_cmd_status_1)

# Ensure this replaced twice since it's used twice (for single and grouped requests)
# Python replace() replaces all occurrences by default.

# 2. Update PUT /api/rescue-requests/:id/decline to also append the details and broadcast
old_req_decline = """app.put('/api/rescue-requests/:id/decline', async (req, res) => {
    try {
        await run(`UPDATE rescue_requests SET status = 'declined', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);
        const reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [req.params.id]);

        broadcast('RESCUE_REQUEST_DECLINED', reqData);
        await logCommand('RESCUE_REQUEST_DECLINED', 'Commander', `Request ID: ${req.params.id}`, {});
        triggerBackup();
        res.json({ message: 'Request declined' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});"""
new_req_decline = """app.put('/api/rescue-requests/:id/decline', async (req, res) => {
    try {
        const { rescuer_phone } = req.body;
        const cleanedPhone = (rescuer_phone || '').replace(/\D/g, '').slice(-10);
        let rescuer = null;
        if (cleanedPhone) {
            rescuer = await get(`SELECT id FROM users WHERE phone = ? OR device_id = ? OR id = ? OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ?`, [rescuer_phone, rescuer_phone, rescuer_phone, `%${cleanedPhone}`]);
        } else {
            rescuer = await get(`SELECT id FROM users WHERE phone = ? OR device_id = ? OR id = ?`, [rescuer_phone, rescuer_phone, rescuer_phone]);
        }
        const descAppend = `\\n[Declined by Rescuer ID: ${rescuer ? rescuer.id : 'Unknown'}]`;

        await run(`UPDATE rescue_requests SET status = 'pending', assigned_user_id = NULL, details = coalesce(details, '') || ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [descAppend, req.params.id]);
        const reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [req.params.id]);

        broadcast('NEW_RESCUE_REQUEST', reqData);
        await logCommand('RESCUE_REQUEST_DECLINED', 'Commander', `Request ID: ${req.params.id}`, {});
        triggerBackup();
        res.json({ message: 'Request declined' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});"""
data = data.replace(old_req_decline, new_req_decline)

# 3. Update runAIAssignment loop skip logic
old_ai_skip = """                // 1.5. Skip if rescuer has already declined this task
                if (req.details && (req.details.includes(`[Declined by Rescuer ${user.phone}]`) || req.details.includes(`[Declined by Rescuer ${user.device_id}]`))) continue;"""
new_ai_skip = """                // 1.5. Skip if rescuer has already declined this task
                if (req.details && req.details.includes(`[Declined by Rescuer ID: ${user.id}]`)) continue;"""
data = data.replace(old_ai_skip, new_ai_skip)

# 4. Add RESCUER_DECLINED_LAST logic in runAIAssignment if bestUser is null but aiUsers > 0
old_ai_exec = """            if (bestUser) {
                // Execution: Assign to the nearest eligible rescuer
                const assignedUserId = bestUser.id;"""
new_ai_exec = """            if (!bestUser && req.details && req.details.includes('[Declined by Rescuer ID:')) {
                // All available AI rescuers declined this task! Alert the Admin Web
                broadcast('RESCUER_DECLINED_LAST', req);
            }
            if (bestUser) {
                // Execution: Assign to the nearest eligible rescuer
                const assignedUserId = bestUser.id;"""
data = data.replace(old_ai_exec, new_ai_exec)

# 5. Add broadcast('RESCUE_REQUEST_UPDATE') in PUT /api/rescue-requests/:id/status
old_req_status_broadcast = """        reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [req.params.id]);

        if (finalStatus === 'completed' && reqData) {"""
new_req_status_broadcast = """        reqData = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [req.params.id]);
        if (reqData) broadcast('RESCUE_REQUEST_UPDATE', reqData);

        if (finalStatus === 'completed' && reqData) {"""
data = data.replace(old_req_status_broadcast, new_req_status_broadcast)


with open(path, "w", encoding="utf8") as f:
    f.write(data)
print("Backend Patch applied!")
