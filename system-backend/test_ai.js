const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./rescue.db');

async function test() {
    const run = (query, params) => new Promise((res, rej) => db.run(query, params, function(err) { if(err) rej(err); else res(this); }));
    const get = (query, params) => new Promise((res, rej) => db.get(query, params, (err, row) => err ? rej(err) : res(row)));
    const all = (query, params) => new Promise((res, rej) => db.all(query, params, (err, rows) => err ? rej(err) : res(rows)));

    try {
        // 1. Make sure AI is enabled
        await run(`INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_enabled', 'true')`);

        // 2. Clear old tasks to make everyone free
        await run(`UPDATE rescue_requests SET status = 'completed'`);

        // 3. Setup a user for AI management
        // Check if we have users
        let user = await get(`SELECT * FROM users WHERE role = 'rescuer' LIMIT 1`);
        if (!user) {
             await run(`INSERT INTO users (name, role, phone, status, ai_managed) VALUES ('Test Rescuer', 'rescuer', '999888777', 'active', 1)`);
             user = await get(`SELECT * FROM users WHERE phone = '999888777'`);
        } else {
             await run(`UPDATE users SET ai_managed = 1, status = 'active' WHERE id = ?`, [user.id]);
        }

        // 4. Set their location to New York
        await run(`INSERT OR REPLACE INTO rescuer_locations (device_id, name, lat, lng, last_updated) VALUES (?, ?, 40.7128, -74.0060, CURRENT_TIMESTAMP)`, 
            [user.phone || user.device_id, user.name]);

        console.log(`Setup complete. User ${user.name} is AI Managed and at NY.`);

        // 5. Simulate HTTP POST to create an SOS
        console.log("Submitting SOS request via API...");
        const res = await fetch('http://localhost:3001/api/rescue-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_id: 'TEST_PUBLIC', phone: '111222333', lat: 40.7130, lng: -74.0070, details: 'Testing AI SOS' })
        });
        
        const reqData = await res.json();
        console.log("SOS Created ID:", reqData.id);

        // 6. Wait a second for AI to run and then check db
        setTimeout(async () => {
            const updatedReq = await get(`SELECT * FROM rescue_requests WHERE id = ?`, [reqData.id]);
            console.log("Assignment Result:", updatedReq.assigned_user_id ? `ASSIGNED to User ID ${updatedReq.assigned_user_id}` : 'STILL PENDING');
        }, 1000);
    } catch(e) {
        console.error(e);
    }
}
test();
