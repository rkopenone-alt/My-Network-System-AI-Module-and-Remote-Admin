import sqlite3

conn = sqlite3.connect('rescue.db')
cursor = conn.cursor()
cursor.execute("SELECT * FROM rescuer_locations")
print("rescuer_locations:", cursor.fetchall())

cursor.execute("SELECT id, name, status, is_online FROM users WHERE status != 'offline' OR is_online != 0")
print("Online users:", cursor.fetchall())

conn.close()
