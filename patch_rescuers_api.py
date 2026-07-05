import re

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_api = """app.get('/api/rescuers', async (req, res) => {
    try { 
        res.json(await all(`
            SELECT rl.*, u.status as status, u.is_online 
            FROM rescuer_locations rl
            LEFT JOIN users u ON rl.device_id = u.serial_number OR rl.device_id = u.phone OR rl.device_id = u.device_id
        `)); 
    }
    catch (e) { res.status(500).json({ error: e.message }); }
});"""

content = re.sub(r'app\.get\(\'/api/rescuers\', async \(req, res\) => \{\s*try \{ res\.json\(await all\(`SELECT \* FROM rescuer_locations`\)\); \}\s*catch \(e\) \{ res\.status\(500\)\.json\(\{ error: e\.message \}\); \}\s*\}\);', new_api, content)

with open('system-backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched /api/rescuers in server.js")
