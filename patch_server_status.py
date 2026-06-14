import re

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_code = """        // Find the rescuer who is accepting or completing the task (robust match on phone/device_id)
        const rPhone = rescuer_phone || cmdData.target_phone;
        const cleanedPhone = (rPhone || '').replace(/\\D/g, '').slice(-10);
        let rescuer = null;
        if (cleanedPhone) {
            rescuer = await get(`SELECT id, phone, device_id, name FROM users WHERE phone = ? OR device_id = ? OR id = ? OR REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ?`, [rPhone, rPhone, rPhone, `%${cleanedPhone}`]);
        } else {
            rescuer = await get(`SELECT id, phone, device_id, name FROM users WHERE phone = ? OR device_id = ? OR id = ?`, [rPhone, rPhone, rPhone]);
        }"""

# Actually, the original is `SELECT id FROM users...` not `SELECT id, phone, device_id, name FROM users...`. Let me be careful.
