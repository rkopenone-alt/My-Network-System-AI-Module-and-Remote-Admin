import re

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix ReferenceError and change get to fetch full rescuer object
old_1 = """        // Find the rescuer who is accepting or completing the task (robust match on phone/device_id)
        const rPhone = rescuer_phone || cmdData.target_phone;
        const cleanedPhone = (rPhone || '').replace(/\\D/g, '').slice(-10);
        let rescuer = null;
        if (cleanedPhone) {
            rescuer = await get(`SELECT id FROM users WHERE phone = ? OR device_id = ? OR id = ? OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ?`, [rPhone, rPhone, rPhone, `%${cleanedPhone}`]);
        } else {
            rescuer = await get(`SELECT id FROM users WHERE phone = ? OR device_id = ? OR id = ?`, [rPhone, rPhone, rPhone]);
        }"""

new_1 = """        // Find the rescuer who is accepting or completing the task (robust match on phone/device_id)
        const rPhone = rescuer_phone;
        const cleanedPhone = (rPhone || '').replace(/\\D/g, '').slice(-10);
        let rescuer = null;
        if (cleanedPhone) {
            rescuer = await get(`SELECT id, phone, device_id, name FROM users WHERE phone = ? OR device_id = ? OR id = ? OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ?`, [rPhone, rPhone, rPhone, `%${cleanedPhone}`]);
        } else {
            rescuer = await get(`SELECT id, phone, device_id, name FROM users WHERE phone = ? OR device_id = ? OR id = ?`, [rPhone, rPhone, rPhone]);
        }"""

# Fix Live Command creation by explicitly inserting to command_queue if it's missing
old_2 = """        if (compImageUrl) {
            if (['accepted', 'in_progress', 'completed'].includes(status) && rescuer) {
                await run(`UPDATE rescue_requests SET status = ?, completion_image_url = ?, assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [finalStatus, compImageUrl, rescuer.id, req.params.id]);
            } else {
                await run(`UPDATE rescue_requests SET status = ?, completion_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [finalStatus, compImageUrl, req.params.id]);
            }
            await run(`UPDATE command_queue SET status = ?, completion_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE command_payload LIKE ?`, [finalStatus, compImageUrl, `%"rescue_req_id":${req.params.id}%`]);
            await run(`UPDATE command_queue SET status = ?, completion_image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE command_payload LIKE ?`, [finalStatus, compImageUrl, `%"rescue_req_id":"${req.params.id}"%`]);
        } else {
            if (['accepted', 'in_progress', 'completed'].includes(status) && rescuer) {
                // Ensure the rescue request is explicitly assigned to this rescuer so it doesn't disappear from their history
                await run(`UPDATE rescue_requests SET status = ?, assigned_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [finalStatus, rescuer.id, req.params.id]);
            } else {
                await run(`UPDATE rescue_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [finalStatus, req.params.id]);
            }
            await run(`UPDATE command_queue SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE command_payload LIKE ?`, [finalStatus, `%"rescue_req_id":${req.params.id}%`]);
            await run(`UPDATE command_queue SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE command_payload LIKE ?`, [finalStatus, `%"rescue_req_id":"${req.params.id}"%`]);
        }"""

new_2 = """        const existingCommand = await get(`SELECT * FROM command_queue WHERE command_payload LIKE ? OR command_payload LIKE ?`, [`%"rescue_req_id":${req.params.id}%`, `%"rescue_req_id":"${req.params.id}"%`]);

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
        }"""

if old_1 in text and old_2 in text:
    text = text.replace(old_1, new_1)
    text = text.replace(old_2, new_2)
    with open('system-backend/server.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Patched successfully!')
else:
    print('Failed to find targets.')
    if old_1 not in text: print("old_1 missing")
    if old_2 not in text: print("old_2 missing")
