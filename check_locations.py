import sqlite3

conn = sqlite3.connect('rescue.db')
cursor = conn.cursor()

print("Rescuer Locations:")
cursor.execute("SELECT * FROM rescuer_locations")
for row in cursor.fetchall():
    print(row)

conn.close()
