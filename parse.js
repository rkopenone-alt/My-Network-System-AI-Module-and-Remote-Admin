const fs = require('fs');
const { htmlString } = require('./rescuer-app/htmlStr.js');
fs.writeFileSync('rescuer-app_parsed.html', htmlString, 'utf-8');
console.log('Saved to rescuer-app_parsed.html');
