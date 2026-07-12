const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'system-backend', 'rescue.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    
    const query = `
        SELECT phone, device_id, type, details, lat, lng, COUNT(*) as count 
        FROM rescue_requests 
        GROUP BY phone, device_id, type, details, lat, lng 
        HAVING COUNT(*) > 1;
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Query error:', err);
        } else {
            console.log(JSON.stringify(rows, null, 2));
        }
        db.close();
    });
});
