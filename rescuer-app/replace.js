const fs = require('fs');
let content = fs.readFileSync('htmlStr.js', 'utf8');

content = content.replace(
  /\$\{isCrit \? '🚨 CRITICAL DIRECTIVE' : '📢 NEW TASK'\}<\/h2>/g,
  "${isCrit ? '🚨 CRITICAL DIRECTIVE' : '📢 NEW TASK'}${c.assigned_by === 'AI' ? '<span style=\"background: #166534; color: white; border-radius: 4px; padding: 2px 6px; font-size: 10px; margin-left: 6px; vertical-align: middle;\">🤖 Assigned by AI</span>' : ''}</h2>"
);

content = content.replace(
  /badgeHtml = `<span class="notif-badge badge-\$\{t.type\}">\$\{t.type\}<\/span>`;\n                    \}/g,
  `badgeHtml = \`<span class="notif-badge badge-\${t.type}">\${t.type}</span>\`;\n                    }\n\n                    if (t.assigned_by === 'AI') badgeHtml += ' <span style="background: #166534; color: white; border-radius: 4px; padding: 2px 6px; font-size: 10px; margin-left: 6px;">🤖 Assigned by AI</span>';`
);

fs.writeFileSync('htmlStr.js', content, 'utf8');
console.log('Replaced successfully');
