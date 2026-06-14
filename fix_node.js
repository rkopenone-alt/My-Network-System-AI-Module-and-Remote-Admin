const fs = require('fs');

function fixFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log("Not found:", filePath);
        return;
    }
    
    let text = fs.readFileSync(filePath, 'utf8');
    
    let rawHtml = '';
    
    if (text.startsWith('export const htmlString = `')) {
        let endIdx = text.lastIndexOf('`;');
        if (endIdx === -1) endIdx = text.lastIndexOf('`');
        rawHtml = text.substring('export const htmlString = `'.length, endIdx);
    } else if (text.startsWith('export const htmlString = "')) {
        let endIdx = text.lastIndexOf('";');
        if (endIdx === -1) endIdx = text.lastIndexOf('"');
        let stringLiteral = text.substring('export const htmlString = '.length, endIdx + 1);
        try {
            // It's a JS string literal, we can eval it to get the raw HTML
            rawHtml = eval(stringLiteral);
        } catch(e) {
            console.log("Eval failed for", filePath, e);
            // If eval fails, we might just have unescaped quotes. 
            // In our case, rescuer-app was "fixed" by Python earlier but maybe left in a weird state.
            // Let's just restore it from htmlStr_thursday.js if we can.
            return;
        }
    } else {
        console.log("Unknown format in", filePath);
        return;
    }
    
    // Now we have rawHtml. Let's serialize it perfectly!
    let safeJs = 'export const htmlString = ' + JSON.stringify(rawHtml) + ';\n';
    fs.writeFileSync(filePath, safeJs, 'utf8');
    console.log("Fixed successfully:", filePath);
}

fixFile('admin-app/htmlStr.js');
fixFile('public-sos-app/htmlStr.js');
fixFile('rescuer-app/htmlStr.js');
