const fs = require('fs');
let t = fs.readFileSync('public-sos-app/htmlStr.js', 'utf8');
console.log(t.substring(0, 2000));
