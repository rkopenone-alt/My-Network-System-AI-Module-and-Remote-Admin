import sqlite3

conn = sqlite3.connect('system-backend/rescue.db')
cursor = conn.cursor()
cursor.execute("SELECT id, serial_number, name, phone, device_id FROM users")
rows = cursor.fetchall()
for row in rows:
    print(row)
conn.close()
