import sqlite3

conn = sqlite3.connect('rescue.db')
cursor = conn.cursor()
cursor.execute("SELECT id, serial_number, name, phone FROM users ORDER BY id")
rows = cursor.fetchall()
for row in rows:
    print(row)
conn.close()
