const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'rescue.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT id, status, type, details, assigned_user_id FROM rescue_requests WHERE status NOT IN ('completed', 'declined', 'finished', 'closed')", (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log("ACTIVE RESCUE REQUESTS:");
            console.log(JSON.stringify(rows, null, 2));
        }
    });

    db.all("SELECT id, status, command_type, target_phone, assigned_by FROM command_queue WHERE status NOT IN ('completed', 'declined', 'finished', 'closed', 'cancelled', 'ignored')", (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log("ACTIVE COMMANDS:");
            console.log(JSON.stringify(rows, null, 2));
        }
    });
});

db.close();
