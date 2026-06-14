const fs = require('fs');
const rawHtml = fs.readFileSync('c:/Users/Alienware/Desktop/Rescue Backup AI 09-06-2026/raw_admin.html', 'utf8');

let safeJs = 'export const htmlString = ' + JSON.stringify(rawHtml) + ';\n';
fs.writeFileSync('c:/Users/Alienware/Desktop/Rescue Backup AI 09-06-2026/admin-app/htmlStr.js', safeJs, 'utf8');
console.log("Repackaged successfully to admin-app/htmlStr.js");
