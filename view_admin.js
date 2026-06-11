const fs = require('fs');
const data = fs.readFileSync('system-backend/server.js', 'utf8');
const lines = data.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('app.post(') || lines[i].includes('app.put(')) {
        console.log(`Line ${i + 1}: ${lines[i].trim()}`);
    }
}
