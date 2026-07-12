const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('rescue.db');
db.get("SELECT value FROM settings WHERE key = 'sos_buffer_minutes';", (err, row) => {
  console.log(JSON.stringify(row));
  db.close();
});
