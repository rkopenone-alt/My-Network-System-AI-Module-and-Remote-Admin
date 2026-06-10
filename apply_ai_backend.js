const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'system-backend', 'server.js');
let content = fs.readFileSync(serverFile, 'utf8');

// 1. Inject runAIAssignment function
const aiFunction = `
// ─── AI-Based Rescue Decision System ──────────────────────────────────────────
const runAIAssignment = async () => {
    try {
        const aiSetting = await get(\`SELECT value FROM settings WHERE key = 'ai_system_enabled'\`);
        if (!aiSetting || aiSetting.value !== '1') return;

        const unassignedRequests = await all(\`SELECT * FROM rescue_requests WHERE status = 'pending' AND assigned_user_id IS NULL AND assigned_group_id IS NULL\`);
        if (unassignedRequests.length === 0) return;

        const activeUsers = await all(\`SELECT * FROM users WHERE status = 'active' AND role = 'rescuer' AND ai_enabled = 1 AND id NOT IN (SELECT assigned_user_id FROM rescue_requests WHERE status IN ('assigned', 'accepted', 'in_progress') AND assigned_user_id IS NOT NULL)\`);
        
        if (activeUsers.length === 0) return;

        for (const req of unassignedRequests) {
            let nearestRescuer = null;
            let minDistance = Infinity;

            for (const user of activeUsers) {
                const loc = await get(\`SELECT lat, lng FROM rescuer_locations WHERE device_id = ? ORDER BY last_updated DESC LIMIT 1\`, [user.device_id]);
                if (loc) {
                    const dist = getDistance(req.lat, req.lng, loc.lat, loc.lng);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestRescuer = user;
                    }
                } else if (!nearestRescuer) {
                    nearestRescuer = user;
                }
            }

            if (nearestRescuer) {
                await run(\`UPDATE rescue_requests SET status = 'assigned', assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?\`, [nearestRescuer.id, req.id]);
                
                const index = activeUsers.findIndex(u => u.id === nearestRescuer.id);
                if (index > -1) activeUsers.splice(index, 1);

                const notifDevice = nearestRescuer.device_id || nearestRescuer.phone || 'unknown_device';
                await run(\`INSERT INTO notifications (device_id, type, message, action_required) VALUES (?, ?, ?, ?)\`,
                    [notifDevice, 'dispatch', \`[AI DISPATCH]: \${(req.type||'').toUpperCase()} at \${req.sector || 'Unknown'}. Urgency: \${req.urgency || 'High'}. Please proceed immediately.\`, 1]);

                await logCommand('AI_ASSIGNMENT', 'AI System', nearestRescuer.name, { reqId: req.id, type: req.type });
                
                const updatedReq = await get(\`SELECT * FROM rescue_requests WHERE id = ?\`, [req.id]);
                broadcast('UPDATE_RESCUE_REQUEST', updatedReq);
            }
        }
    } catch (e) {
        console.error('[AI Assignment Error]:', e);
    }
};
`;

if (!content.includes('runAIAssignment')) {
    content = content.replace(
        "app.post('/api/rescue-requests', async (req, res) => {",
        aiFunction + "\napp.post('/api/rescue-requests', async (req, res) => {"
    );
}

// 2. Call runAIAssignment on new SOS
if (!content.includes('setTimeout(runAIAssignment, 500);')) {
    content = content.replace(
        "setTimeout(groupTasks, 500);",
        "setTimeout(groupTasks, 500);\n        setTimeout(runAIAssignment, 500);"
    );
}

// 3. Call runAIAssignment on completion
if (!content.includes('if (finalStatus === \'completed\' || finalStatus === \'declined\') { setTimeout(runAIAssignment, 500); }')) {
    content = content.replace(
        "// Dismiss pending new_task notification for this request ID",
        "if (finalStatus === 'completed' || finalStatus === 'declined') { setTimeout(runAIAssignment, 500); }\n            // Dismiss pending new_task notification for this request ID"
    );
}

// 4. Add AI API endpoints
const aiEndpoints = `
// ─── AI Settings API ──────────────────────────────────────────────────────────
app.post('/api/ai/toggle', async (req, res) => {
    const { enabled } = req.body;
    try {
        await run(\`UPDATE settings SET value = ? WHERE key = 'ai_system_enabled'\`, [enabled ? '1' : '0']);
        await logCommand('AI_SYSTEM_TOGGLED', 'Admin', 'System', { enabled });
        if (enabled) setTimeout(runAIAssignment, 500);
        broadcast('AI_STATUS_UPDATE', { enabled });
        res.json({ success: true, enabled });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/:id/ai', async (req, res) => {
    const { ai_enabled } = req.body;
    try {
        await run(\`UPDATE users SET ai_enabled = ? WHERE id = ?\`, [ai_enabled ? 1 : 0, req.params.id]);
        await logCommand('USER_AI_TOGGLED', 'Admin', \`User \${req.params.id}\`, { ai_enabled });
        res.json({ success: true, ai_enabled });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/groups/:id/ai', async (req, res) => {
    const { ai_enabled } = req.body;
    try {
        await run(\`UPDATE groups SET ai_enabled = ? WHERE id = ?\`, [ai_enabled ? 1 : 0, req.params.id]);
        await logCommand('GROUP_AI_TOGGLED', 'Admin', \`Group \${req.params.id}\`, { ai_enabled });
        res.json({ success: true, ai_enabled });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

`;

if (!content.includes('/api/ai/toggle')) {
    content = content.replace(
        "app.put('/api/groups/:id', async (req, res) => {",
        aiEndpoints + "\napp.put('/api/groups/:id', async (req, res) => {"
    );
}

fs.writeFileSync(serverFile, content, 'utf8');
console.log('AI logic injected successfully.');
