const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'rescue.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    db.all(`SELECT id, details FROM rescue_requests WHERE details LIKE '%data:image/%'`, (err, rows) => {
        if (err) {
            console.error('Error querying database', err.message);
            process.exit(1);
        }

        console.log(`Found ${rows.length} rows with large images embedded in details.`);

        rows.forEach(row => {
            try {
                let detailsObj = JSON.parse(row.details);
                if (detailsObj && detailsObj.needs && detailsObj.needs.photo) {
                    delete detailsObj.needs.photo; // Remove the massive base64 blob
                    const newDetails = JSON.stringify(detailsObj);
                    
                    db.run(`UPDATE rescue_requests SET details = ? WHERE id = ?`, [newDetails, row.id], function(err) {
                        if (err) {
                            console.error(`Failed to update row ${row.id}`, err.message);
                        } else {
                            console.log(`Successfully scrubbed row ${row.id}.`);
                        }
                    });
                }
            } catch (e) {
                console.error(`Failed to parse JSON for row ${row.id}`);
            }
        });
    });
});
