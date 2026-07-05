import sqlite3

conn = sqlite3.connect('system-backend/rescue.db')
cursor = conn.cursor()
cursor.execute("SELECT * FROM rescuer_locations")
print("rescuer_locations:", cursor.fetchall())
conn.close()
