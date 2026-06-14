const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'rescuer-app', 'htmlStr.js');
let htmlStr = fs.readFileSync(filePath, 'utf8');

const idx = htmlStr.indexOf('this.API = finalIp ?');
if (idx !== -1) {
    console.log("Found it at", idx);
    
    // Exact old regex
    const regex = /this\.API = finalIp \? `http:\/\/\$\{finalIp\}:3001\/api` : '';\\r\\n\s+this\.WS_URL = finalIp \? `ws:\/\/\$\{finalIp\}:3001` : '';/;
    
    const replacement = `let hasProto = finalIp.startsWith('http://') || finalIp.startsWith('https://');\\r\\n                let hasP = finalIp.split(':').length > (hasProto ? 2 : 1);\\r\\n                let hUrl = hasProto ? finalIp : 'http://' + finalIp;\\r\\n                if (!hasP) hUrl += ':3001';\\r\\n                this.API = finalIp ? hUrl + '/api' : '';\\r\\n                this.WS_URL = finalIp ? hUrl.replace('http://', 'ws://').replace('https://', 'wss://') : '';`;

    if (regex.test(htmlStr)) {
        htmlStr = htmlStr.replace(regex, replacement);
        fs.writeFileSync(filePath, htmlStr);
        console.log("Successfully patched htmlStr.js via regex!");
    } else {
        console.log("Regex didn't match. Here is the snippet:");
        console.log(htmlStr.substring(idx - 50, idx + 100));
        
        // Let's do a direct string replace if possible
        const directOld = "this.API = finalIp ? `http://${finalIp}:3001/api` : '';\\r\\n                this.WS_URL = finalIp ? `ws://${finalIp}:3001` : '';";
        if (htmlStr.includes(directOld)) {
            htmlStr = htmlStr.replace(directOld, replacement);
            fs.writeFileSync(filePath, htmlStr);
            console.log("Successfully patched htmlStr.js via direct match!");
        } else {
            console.log("Direct match also failed.");
        }
    }
} else {
    console.log("Could not find 'this.API = finalIp ?' in the file.");
}
