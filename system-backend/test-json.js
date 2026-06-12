const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(':memory:');
db.serialize(() => {
    db.run('CREATE TABLE test (cmd TEXT)');
    db.run('INSERT INTO test VALUES (\'{"id": 123}\')');
    db.get('SELECT json_extract(cmd, \'$.id\') as extracted FROM test', (err, row) => console.log(err || row));
});
