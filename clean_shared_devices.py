import sqlite3

conn = sqlite3.connect('system-backend/rescue.db')
cursor = conn.cursor()

# Find device_ids shared by multiple users
cursor.execute('''
    SELECT device_id FROM users
    WHERE device_id IS NOT NULL
    GROUP BY device_id
    HAVING COUNT(id) > 1
''')
shared_devices = cursor.fetchall()

for (device_id,) in shared_devices:
    # Set all of them to NULL so next login assigns it properly
    cursor.execute("UPDATE users SET device_id = NULL, is_online = 0, status = 'offline' WHERE device_id = ?", (device_id,))
    
conn.commit()

# Also let's clean up any rescuer_locations that have duplicate user rows just for hygiene
cursor.execute('''
    DELETE FROM rescuer_locations
    WHERE id NOT IN (
        SELECT MAX(id) FROM rescuer_locations GROUP BY name
    )
''')
conn.commit()

conn.close()
print("Cleaned up shared device IDs and old locations!")
