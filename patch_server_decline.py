import os

path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\system-backend\server.js"
with open(path, "r", encoding="utf8") as f:
    data = f.read()

# Fix 1: Fallback to cmdData.target_phone to find the rescuer ID when declined
old_rescuer_match = """        // Find the rescuer who is accepting or completing the task (robust match on phone/device_id)
        const cleanedPhone = (rescuer_phone || '').replace(/\\D/g, '').slice(-10);
        let rescuer = null;
        if (cleanedPhone) {
            rescuer = await get(`SELECT id FROM users WHERE phone = ? OR device_id = ? OR id = ? OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ?`, [rescuer_phone, rescuer_phone, rescuer_phone, `%${cleanedPhone}`]);
        } else {
            rescuer = await get(`SELECT id FROM users WHERE phone = ? OR device_id = ? OR id = ?`, [rescuer_phone, rescuer_phone, rescuer_phone]);
        }"""

new_rescuer_match = """        // Find the rescuer who is accepting or completing the task (robust match on phone/device_id)
        const rPhone = rescuer_phone || cmdData.target_phone;
        const cleanedPhone = (rPhone || '').replace(/\\D/g, '').slice(-10);
        let rescuer = null;
        if (cleanedPhone) {
            rescuer = await get(`SELECT id FROM users WHERE phone = ? OR device_id = ? OR id = ? OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ?`, [rPhone, rPhone, rPhone, `%${cleanedPhone}`]);
        } else {
            rescuer = await get(`SELECT id FROM users WHERE phone = ? OR device_id = ? OR id = ?`, [rPhone, rPhone, rPhone]);
        }"""

data = data.replace(old_rescuer_match, new_rescuer_match)

# Fix 2: Change NEW_RESCUE_REQUEST to RESCUE_REQUEST_DECLINED_REASSIGN for commands endpoint
old_broadcast_event = """                    if (status === 'declined') {
                        reqFinalStatus = 'pending';
                        descAppend = `\\n[Declined by Rescuer ID: ${rescuer ? rescuer.id : 'Unknown'}]`;
                        setAssignedNull = true;
                        broadcastEvent = 'NEW_RESCUE_REQUEST';
                    }"""

new_broadcast_event = """                    if (status === 'declined') {
                        reqFinalStatus = 'pending';
                        descAppend = `\\n[Declined by Rescuer ID: ${rescuer ? rescuer.id : 'Unknown'}]`;
                        setAssignedNull = true;
                        broadcastEvent = 'RESCUE_REQUEST_DECLINED_REASSIGN';
                    }"""

data = data.replace(old_broadcast_event, new_broadcast_event)

# Fix 3: Change NEW_RESCUE_REQUEST to RESCUE_REQUEST_DECLINED_REASSIGN for rescue-requests endpoint
old_decline_broadcast = """        broadcast('NEW_RESCUE_REQUEST', reqData);
        await logCommand('RESCUE_REQUEST_DECLINED', 'Commander', `Request ID: ${req.params.id}`, {});"""

new_decline_broadcast = """        broadcast('RESCUE_REQUEST_DECLINED_REASSIGN', reqData);
        await logCommand('RESCUE_REQUEST_DECLINED', 'Commander', `Request ID: ${req.params.id}`, {});"""

data = data.replace(old_decline_broadcast, new_decline_broadcast)

# Fix 4: Also fix the same in the group request decline part
old_group_broadcast_event = """                    if (status === 'declined') {
                        reqFinalStatus = 'pending';
                        descAppend = `\\n[Declined by Rescuer ID: ${rescuer ? rescuer.id : 'Unknown'}]`;
                        setAssignedNull = true;
                        broadcastEvent = 'NEW_RESCUE_REQUEST';
                    }"""

new_group_broadcast_event = """                    if (status === 'declined') {
                        reqFinalStatus = 'pending';
                        descAppend = `\\n[Declined by Rescuer ID: ${rescuer ? rescuer.id : 'Unknown'}]`;
                        setAssignedNull = true;
                        broadcastEvent = 'RESCUE_REQUEST_DECLINED_REASSIGN';
                    }"""
data = data.replace(old_group_broadcast_event, new_group_broadcast_event)

with open(path, "w", encoding="utf8") as f:
    f.write(data)
print("server.js patched successfully for decline tracking and broadcasting.")
