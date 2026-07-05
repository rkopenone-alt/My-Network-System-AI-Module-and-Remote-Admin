import sqlite3

conn = sqlite3.connect('rescue.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall()]
print("Tables:", tables)

table_names_to_check = ['members', 'users', 'rescuers', 'connected_users', 'active_users']
found_table = None
for t in table_names_to_check:
    if t in tables:
        found_table = t
        break

if found_table:
    print(f"\nChecking table: {found_table}")
    try:
        cursor.execute(f"PRAGMA table_info({found_table});")
        columns = [col[1] for col in cursor.fetchall()]
        print("Columns:", columns)

        cursor.execute(f"SELECT * FROM {found_table}")
        rows = cursor.fetchall()
        for row in rows:
            print(row)
    except Exception as e:
        print(e)
else:
    print("No matching user/member table found")

conn.close()
