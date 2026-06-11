const fs = require('fs');
let data = fs.readFileSync('rescuer-app/htmlStr.js', 'utf8');

const regexTarget = /const myDeviceId = this\.user\?\.device_id;\s+const myGroups = \(this\.user\?\.groups \|\| \[\]\)\.map\(g => Number\(g\.id \|\| g\.group_id\)\);\s+\/\/ Match phone normalized \(last 10 digits\) or device_id directly\s+const myPhoneClean = \(myPhone \|\| ''\)\.replace\(\/\\\\D\/g,''\)\.slice\(-10\);\s+const tpClean = \(c\.target_phone \|\| ''\)\.replace\(\/\\\\D\/g,''\)\.slice\(-10\);\s+const isTargeted = c\.target_phone && \(\s+c\.target_phone === myPhone \|\|\s+c\.target_phone === myDeviceId \|\|\s+\(myPhoneClean && tpClean && tpClean === myPhoneClean\)\s+\);/s;

const newTarget = `const myDeviceId = this.user?.device_id;
                const myId = this.user?.id?.toString();
                const myGroups = (this.user?.groups || []).map(g => Number(g.id || g.group_id));

                // Match phone normalized (last 10 digits) or device_id directly
                const myPhoneClean = (myPhone || '').replace(/\\D/g,'').slice(-10);
                const tpClean = (c.target_phone || '').replace(/\\D/g,'').slice(-10);
                const isTargeted = c.target_phone && (
                    c.target_phone === myPhone ||
                    c.target_phone === myDeviceId ||
                    c.target_phone === myId ||
                    (myPhoneClean && tpClean && tpClean === myPhoneClean)
                );`;

if (regexTarget.test(data)) {
    data = data.replace(regexTarget, newTarget);
    console.log('Target logic patched via regex.');
} else {
    console.log('Target logic NOT FOUND via regex.');
}

const uiRegex = /<h2 style=\\"color: \$\{isCrit \? '#ef4444' : '#3b82f6'\}; margin-top: 0;\\">\$\{isCrit \? '\\ud83d\\udea8 CRITICAL DIRECTIVE' : '\\ud83d\\udce2 NEW TASK'\}<\/h2>/g;
const uiNew = `<h2 style=\\"color: \${isCrit ? '#ef4444' : '#3b82f6'}; margin-top: 0;\\">\${isCrit ? '\\ud83d\\udea8 CRITICAL DIRECTIVE' : '\\ud83d\\udce2 NEW TASK'} #\${payload.rescue_req_id || c.id}</h2>`;

if (uiRegex.test(data)) {
    data = data.replace(uiRegex, uiNew);
    console.log('UI logic patched via regex.');
} else {
    console.log('UI logic NOT FOUND via regex.');
    const uiRegex2 = /<h2 style="color: \$\{isCrit \? '#ef4444' : '#3b82f6'\}; margin-top: 0;">\$\{isCrit \? '🚨 CRITICAL DIRECTIVE' : '📢 NEW TASK'\}<\/h2>/g;
    const uiNew2 = `<h2 style="color: \${isCrit ? '#ef4444' : '#3b82f6'}; margin-top: 0;">\${isCrit ? '🚨 CRITICAL DIRECTIVE' : '📢 NEW TASK'} #\${payload.rescue_req_id || c.id}</h2>`;
    if (uiRegex2.test(data)) {
        data = data.replace(uiRegex2, uiNew2);
        console.log('UI logic (alt) patched.');
    } else {
        console.log('UI logic (alt) NOT FOUND either.');
    }
}

fs.writeFileSync('rescuer-app/htmlStr.js', data);
