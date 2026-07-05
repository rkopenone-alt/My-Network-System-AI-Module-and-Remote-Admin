import sqlite3

conn = sqlite3.connect('rescue.db')
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(rescuer_locations);")
print("rescuer_locations columns:", cursor.fetchall())

cursor.execute("SELECT * FROM rescuer_locations")
print(cursor.fetchall())

cursor.execute("SELECT * FROM group_members")
print("group_members:")
print(cursor.fetchall())

conn.close()
