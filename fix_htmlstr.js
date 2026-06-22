const fs = require('fs');

function fix(file) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace incorrectly escaped single quotes inside the postMessage calls
    content = content.replace(/\\\'PLAY_SOUND\\\'/g, "'PLAY_SOUND'");
    content = content.replace(/\\\'STOP_SOUND\\\'/g, "'STOP_SOUND'");
    content = content.replace(/\\\'siren_loop\\\'/g, "'siren_loop'");

    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed syntax in', file);
}

fix('./rescuer-app/htmlStr.js');
fix('./public-sos-app/htmlStr.js');
