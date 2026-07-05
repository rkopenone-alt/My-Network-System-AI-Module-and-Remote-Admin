import sqlite3

conn = sqlite3.connect('rescue.db')
cursor = conn.cursor()

print("Group Members:")
cursor.execute("SELECT * FROM group_members")
for row in cursor.fetchall():
    print(row)

print("\nGroups:")
cursor.execute("SELECT * FROM groups")
for row in cursor.fetchall():
    print(row)

conn.close()
