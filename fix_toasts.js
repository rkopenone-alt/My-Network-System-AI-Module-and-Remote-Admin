const fs = require('fs');

function fixFile(file) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace this.toast('message', 'corrupted') with this.toast('message')
    // We match this.toast(  arg1 , 'corrupted_string' )
    content = content.replace(/(\.toast\([^,]+?)\s*,\s*['"][^'"]+['"]\s*\)/g, ')');
    // Fix toast calls with 3 args like: .toast('msg', 'corrupted', 2000)
    content = content.replace(/(\.toast\([^,]+?)\s*,\s*['"][^'"]+['"]\s*(,\s*\d+\s*)\)/g, ')');
    
    // Fix the default parameter in toast(msg, icon = 'corrupted')
    content = content.replace(/toast\(msg,\s*icon\s*=\s*['"][^'"]+['"]/, 'toast(msg, icon = ""');
    content = content.replace(/toast\(msg,\s*icon\s*=\s*['"][^'"]+['"]\s*,\s*duration/, 'toast(msg, icon = "", duration');

    // Manually fix the exact syntax errors with quotes
    content = content.replace(/"dY""/g, '"');
    content = content.replace(/"dY""/g, '"');

    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
}

fixFile('preview-rescuer.html');
fixFile('preview-mobile-app.html');
