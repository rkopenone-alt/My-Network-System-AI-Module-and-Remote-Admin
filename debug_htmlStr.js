const fs = require('fs');
let data = fs.readFileSync('rescuer-app/htmlStr.js', 'utf8');

const idx = data.indexOf('myDeviceId');
if (idx !== -1) {
    console.log(data.substring(idx - 200, idx + 800));
} else {
    console.log('myDeviceId not found');
}
