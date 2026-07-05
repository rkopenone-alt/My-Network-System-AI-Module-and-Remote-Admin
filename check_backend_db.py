import sqlite3
from collections import Counter

conn = sqlite3.connect('system-backend/rescue.db')
cursor = conn.cursor()
cursor.execute("SELECT id, serial_number, name FROM users ORDER BY id")
rows = cursor.fetchall()
for row in rows:
    print(row)
    
cursor.execute("SELECT * FROM group_members")
print("group_members:", cursor.fetchall())

conn.close()
