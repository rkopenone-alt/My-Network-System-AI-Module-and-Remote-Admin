import sqlite3

conn = sqlite3.connect('rescue.db')
cursor = conn.cursor()

cursor.execute("DELETE FROM rescuer_locations")
print(f"Deleted {cursor.rowcount} from rescuer_locations")

# What about group_members? I already deleted orphans. Let's see if there are duplicates.
# "if you check the members list there is few id are repeated multiple times."
# Let's delete any actual duplicate user_id within group_members.
cursor.execute("""
    DELETE FROM group_members 
    WHERE id NOT IN (
        SELECT MIN(id) 
        FROM group_members 
        GROUP BY user_id, group_id
    )
""")
print(f"Deleted {cursor.rowcount} duplicates from group_members")

conn.commit()
conn.close()
