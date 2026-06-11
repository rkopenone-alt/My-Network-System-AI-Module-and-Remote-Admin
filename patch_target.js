const fs = require('fs');
let data = fs.readFileSync('rescuer-app/htmlStr.js', 'utf8');

const idx1 = data.indexOf('c.target_phone === myPhone ||');
const idx2 = data.indexOf('(myPhoneClean && tpClean && tpClean === myPhoneClean)');

if (idx1 !== -1 && idx2 !== -1) {
    const chunkToReplace = data.substring(idx1, idx2);
    if (!chunkToReplace.includes('c.target_phone === myId')) {
        const replacement = chunkToReplace.replace('c.target_phone === myDeviceId ||', 'c.target_phone === myDeviceId ||\\n                    c.target_phone === myId ||');
        data = data.substring(0, idx1) + replacement + data.substring(idx2);
        
        // now inject myId variable before it
        const deviceIdx = data.indexOf('const myDeviceId = this.user?.device_id;');
        if (deviceIdx !== -1) {
            data = data.substring(0, deviceIdx + 40) + '\\n                const myId = this.user?.id?.toString();' + data.substring(deviceIdx + 40);
            console.log('Target logic patched manually.');
            fs.writeFileSync('rescuer-app/htmlStr.js', data);
        } else {
            console.log('Could not find myDeviceId declaration.');
        }
    } else {
        console.log('Target logic already patched.');
    }
} else {
    console.log('Could not find targeting logic indices.');
}
