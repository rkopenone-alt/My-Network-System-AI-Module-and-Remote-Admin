import sqlite3
import collections

conn = sqlite3.connect('rescue.db')
cursor = conn.cursor()

cursor.execute("SELECT id, name, role, phone, serial_number FROM users")
users = cursor.fetchall()
print("Users:")
for u in users:
    print(u)

# Clean up group_members with no matching user
cursor.execute("DELETE FROM group_members WHERE user_id NOT IN (SELECT id FROM users)")
print("Deleted orphaned group_members:", cursor.rowcount)

# Clean up rescuer_locations with no matching user?
# Wait, rescuer_locations uses device_id (serial_number in users)
cursor.execute("DELETE FROM rescuer_locations WHERE device_id NOT IN (SELECT serial_number FROM users WHERE serial_number IS NOT NULL)")
print("Deleted orphaned rescuer_locations by serial_number:", cursor.rowcount)

# Wait, `MEM-01` is `serial_number` for user 20 (Arjun Singh). So it's not orphaned.
# But if it's "disconnected", it should not be on the map?
# Let's check the map logic. "the map is listing disconnected id 1 in map check and resolve"
# Does rescuer_locations have a "status" column? Yes, 'active' or 'disconnected'
# Maybe we should delete from rescuer_locations where status = 'disconnected'? Or the map should filter them?
# Let's look at rescuer_locations.
cursor.execute("SELECT * FROM rescuer_locations")
print("Remaining rescuer_locations:", cursor.fetchall())

conn.commit()
conn.close()
