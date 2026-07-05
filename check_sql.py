import sqlite3
import pandas as pd

conn = sqlite3.connect('rescue.db')
query = """
            SELECT u.*
            FROM users u
            LEFT JOIN rescuer_locations rl ON u.device_id = rl.device_id OR u.phone = rl.device_id OR u.serial_number = rl.device_id OR CAST(u.id AS TEXT) = rl.device_id
"""
df = pd.read_sql_query(query, conn)
print("Total rows:", len(df))
print(df['name'].value_counts())
conn.close()
