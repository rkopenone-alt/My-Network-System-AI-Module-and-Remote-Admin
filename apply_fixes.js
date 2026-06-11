const fs = require('fs');

// 1. Fix server.js
let serverJs = fs.readFileSync('system-backend/server.js', 'utf8');

const target1 = `const insertRes = await run(\`INSERT INTO command_queue (target_phone, command_type, command_payload, status, priority) VALUES (?, ?, ?, 'assigned', ?)\`,
                    [assignedPhone, commandType, cmdPayload, commandType]);`;

const replace1 = `const existingCmd = await get(\`SELECT id FROM command_queue WHERE command_payload LIKE ? AND command_type = ? ORDER BY created_at DESC LIMIT 1\`, ['%"rescue_req_id":' + req.id + '%', commandType]);
                let cmdId;
                if (existingCmd) {
                    await run(\`UPDATE command_queue SET target_phone = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = ?\`, [assignedPhone, existingCmd.id]);
                    cmdId = existingCmd.id;
                } else {
                    const insertRes = await run(\`INSERT INTO command_queue (target_phone, command_type, command_payload, status, priority) VALUES (?, ?, ?, 'assigned', ?)\`, [assignedPhone, commandType, cmdPayload, commandType]);
                    cmdId = insertRes.lastID;
                }`;

serverJs = serverJs.replace(target1, replace1);

const target2 = `const newCmd = await get(\`SELECT * FROM command_queue WHERE id = ?\`, [insertRes.lastID]);`;
const replace2 = `const newCmd = await get(\`SELECT * FROM command_queue WHERE id = ?\`, [cmdId]);`;
serverJs = serverJs.replace(target2, replace2);

fs.writeFileSync('system-backend/server.js', serverJs);

// 2. Fix admin-app App.js
let adminAppJs = fs.readFileSync('admin-app/App.js', 'utf8');
if (!adminAppJs.includes('mediaPlaybackRequiresUserAction')) {
    adminAppJs = adminAppJs.replace('<WebView', '<WebView\n        mediaPlaybackRequiresUserAction={false}');
    fs.writeFileSync('admin-app/App.js', adminAppJs);
}

// 3. Fix rescuer-app App.js
let rescuerAppJs = fs.readFileSync('rescuer-app/App.js', 'utf8');
if (!rescuerAppJs.includes('mediaPlaybackRequiresUserAction')) {
    rescuerAppJs = rescuerAppJs.replace('<WebView', '<WebView\n        mediaPlaybackRequiresUserAction={false}');
    fs.writeFileSync('rescuer-app/App.js', rescuerAppJs);
}

// 4. Fix rescuer-app htmlStr.js targeting logic
let rescuerHtml = fs.readFileSync('rescuer-app/htmlStr.js', 'utf8');

// Also fix notification duplication issue in handleCommand logic
// wait, the previous code block only checked phone. 
const targetLogic = `                let isTarget = false;
                if (c.target_phone) {
                    const cleanTarget = c.target_phone.replace(/\\D/g, '').slice(-10);
                    const cleanMy = this.user.phone.replace(/\\D/g, '').slice(-10);
                    if (cleanTarget === cleanMy) isTarget = true;
                } else if (c.group_id) {
                    const myGroups = await core.getMyGroups();
                    if (myGroups.includes(c.group_id)) isTarget = true;
                }
                if (!c.target_phone && !c.group_id) isTarget = true;`;

const replaceLogic = `                let isTarget = false;
                if (c.target_phone) {
                    if (c.target_phone === this.user.phone || c.target_phone === this.user.device_id || c.target_phone == this.user.id) {
                        isTarget = true;
                    } else if (this.user.phone) {
                        const cleanTarget = String(c.target_phone).replace(/\\D/g, '').slice(-10);
                        const cleanMy = String(this.user.phone).replace(/\\D/g, '').slice(-10);
                        if (cleanTarget && cleanTarget === cleanMy) isTarget = true;
                    }
                } else if (c.group_id) {
                    const myGroups = await core.getMyGroups();
                    if (myGroups.includes(c.group_id)) isTarget = true;
                }
                if (!c.target_phone && !c.group_id) isTarget = true;`;

rescuerHtml = rescuerHtml.replace(targetLogic, replaceLogic);
fs.writeFileSync('rescuer-app/htmlStr.js', rescuerHtml);

console.log('Edits applied successfully!');
