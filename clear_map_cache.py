import sqlite3

conn = sqlite3.connect('rescue.db')
cursor = conn.cursor()

cursor.execute("DELETE FROM map_cache")
print(f"Deleted {cursor.rowcount} from map_cache")

conn.commit()
conn.close()
