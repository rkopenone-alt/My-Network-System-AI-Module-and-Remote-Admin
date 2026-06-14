const fs = require('fs');
const content = fs.readFileSync('c:/Users/Alienware/Desktop/Rescue Backup AI 09-06-2026/admin-app/htmlStr.js', 'utf8');

const startStr = 'export const htmlString = ';
if (content.startsWith(startStr)) {
    let jsonStr = content.substring(startStr.length).trim();
    if (jsonStr.endsWith(';')) jsonStr = jsonStr.substring(0, jsonStr.length - 1);
    
    try {
        const rawHtml = JSON.parse(jsonStr);
        fs.writeFileSync('c:/Users/Alienware/Desktop/Rescue Backup AI 09-06-2026/raw_admin.html', rawHtml, 'utf8');
        console.log("Extracted successfully to raw_admin.html");
    } catch (e) {
        console.error("JSON parse failed", e);
    }
} else {
    console.error("Format unrecognized");
}
