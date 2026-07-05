import sqlite3
from collections import Counter

conn = sqlite3.connect('rescue.db')
cursor = conn.cursor()
query = """
            SELECT u.*
            FROM users u
            LEFT JOIN rescuer_locations rl ON u.device_id = rl.device_id OR u.phone = rl.device_id OR u.serial_number = rl.device_id OR CAST(u.id AS TEXT) = rl.device_id
"""
cursor.execute(query)
rows = cursor.fetchall()
print("Total rows:", len(rows))
names = [row[2] for row in rows]
counts = Counter(names)
print("Duplicates:", {k:v for k,v in counts.items() if v > 1})
conn.close()
