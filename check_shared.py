import sqlite3

conn = sqlite3.connect('system-backend/rescue.db')
cursor = conn.cursor()
cursor.execute('''
    SELECT device_id FROM users
    WHERE device_id IS NOT NULL
    GROUP BY device_id
    HAVING COUNT(id) > 1
''')
shared_devices = cursor.fetchall()
print("Shared devices remaining:", shared_devices)
conn.close()
