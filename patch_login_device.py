import re

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """        if (deviceId) {
            // Always update device ID to the current one so notifications reach the active session
            await run(`UPDATE users SET device_id = ? WHERE id = ?`, [deviceId, user.id]);
            user.device_id = deviceId;
        }"""

new_logic = """        if (deviceId) {
            // Unlink this device from any other user to prevent cross-login presence bugs
            await run(`UPDATE users SET device_id = NULL, is_online = 0, status = 'offline' WHERE device_id = ?`, [deviceId]);
            // Always update device ID to the current one so notifications reach the active session
            await run(`UPDATE users SET device_id = ? WHERE id = ?`, [deviceId, user.id]);
            user.device_id = deviceId;
        }"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('system-backend/server.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched login deviceId logic successfully!")
else:
    print("Could not find the old logic block!")
