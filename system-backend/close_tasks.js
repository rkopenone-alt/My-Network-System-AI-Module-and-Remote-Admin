const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'rescue.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Mark them as closed
    db.run("UPDATE rescue_requests SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE status NOT IN ('completed', 'closed', 'finished')", function(err) {
        if (err) console.error(err);
        else console.log("Updated rows:", this.changes);
        db.close();
    });
});
