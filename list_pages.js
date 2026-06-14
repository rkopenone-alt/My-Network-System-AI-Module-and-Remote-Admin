const fs = require('fs');
let t = fs.readFileSync('public-sos-app/htmlStr.js', 'utf8');
const regex = /id="page-([^"]+)"/g;
let match;
const pages = [];
while ((match = regex.exec(t)) !== null) {
    pages.push(match[1]);
}
console.log('Pages in public app:', pages);

// Let's also check where to inject the sound button. 
// Maybe inside the "profile" or "history" page?
