const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('rescue.db');
db.all("SELECT id, phone, type, created_at FROM rescue_requests WHERE phone='918000000001';", (err, rows) => {
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
