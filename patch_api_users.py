import re

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the query in /api/users
old_query = """        let query = `
            SELECT u.*, rl.lat, rl.lng, rl.last_updated as location_last_updated,
                   (strftime('%s', 'now') - strftime('%s', rl.last_updated)) as location_age_seconds
            FROM users u
            LEFT JOIN rescuer_locations rl ON u.device_id = rl.device_id OR u.phone = rl.device_id OR u.serial_number = rl.device_id OR CAST(u.id AS TEXT) = rl.device_id
        `;
        let params = [];
        if (role) {
            query += ` WHERE u.role = ? `;
            params.push(role);
        }
        query += ` ORDER BY u.registered_at DESC `;"""

new_query = """        let query = `
            SELECT u.*, rl.lat, rl.lng, rl.last_updated as location_last_updated,
                   (strftime('%s', 'now') - strftime('%s', rl.last_updated)) as location_age_seconds
            FROM users u
            LEFT JOIN rescuer_locations rl ON u.device_id = rl.device_id OR u.phone = rl.device_id OR u.serial_number = rl.device_id OR CAST(u.id AS TEXT) = rl.device_id
        `;
        let params = [];
        if (role) {
            query += ` WHERE u.role = ? `;
            params.push(role);
        }
        query += ` GROUP BY u.id ORDER BY u.registered_at DESC `;"""

if old_query in content:
    content = content.replace(old_query, new_query)
    with open('system-backend/server.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched /api/users query to include GROUP BY u.id")
else:
    print("Could not find the old query block!")
