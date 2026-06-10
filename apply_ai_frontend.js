const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, 'system-backend', 'public', 'Web ADMIN.html');
let content = fs.readFileSync(htmlFile, 'utf8');

// 1. Header AI Toggle
const aiToggleHtml = `
            <div style="display: flex; align-items: center; gap: 8px; margin-right: 16px; background: #f8fafc; padding: 4px 12px; border-radius: 8px; border: 1px solid var(--border);">
                <span style="font-size: 12px; font-weight: 800; color: var(--text-main);">AI ROUTING</span>
                <label style="position: relative; display: inline-block; width: 34px; height: 20px;">
                    <input type="checkbox" id="globalAiToggle" onchange="toggleGlobalAI(this.checked)" style="opacity: 0; width: 0; height: 0;">
                    <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px;" id="globalAiSlider"></span>
                </label>
                <style>
                    #globalAiToggle:checked + span { background-color: #22c55e; }
                    #globalAiSlider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                    #globalAiToggle:checked + #globalAiSlider:before { transform: translateX(14px); }
                </style>
            </div>
`;

if (!content.includes('globalAiToggle')) {
    content = content.replace(
        '<div style="width: 300px; display: flex; flex-direction: column; align-items: flex-end;',
        aiToggleHtml + '\n        <div style="width: 300px; display: flex; flex-direction: column; align-items: flex-end;'
    );
}

// 2. JS Functions
const aiFunctions = `
// ─── AI Settings Functions ──────────────────────────────────────────────
async function toggleGlobalAI(enabled) {
    try {
        const res = await fetch(\`http://\${SERVER_IP}:3001/api/ai/toggle\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${authToken}\` },
            body: JSON.stringify({ enabled })
        });
        if (!res.ok) {
            document.getElementById('globalAiToggle').checked = !enabled;
            alert('Failed to toggle AI system');
        }
    } catch(e) {
        document.getElementById('globalAiToggle').checked = !enabled;
        console.error(e);
    }
}

async function loadAISettings() {
    try {
        const res = await fetch(\`http://\${SERVER_IP}:3001/api/settings\`);
        if (res.ok) {
            const settings = await res.json();
            const aiSetting = settings.find(s => s.key === 'ai_system_enabled');
            if (aiSetting && document.getElementById('globalAiToggle')) {
                document.getElementById('globalAiToggle').checked = aiSetting.value === '1';
            }
        }
    } catch(e) { console.error('Failed to load AI settings', e); }
}

function handleAIStatusUpdate(data) {
    if (document.getElementById('globalAiToggle')) {
        document.getElementById('globalAiToggle').checked = data.enabled;
    }
}
`;

if (!content.includes('toggleGlobalAI')) {
    content = content.replace(
        '// ─── INIT & UTILS ─────────────────────────────────────────────────────────────',
        aiFunctions + '\n// ─── INIT & UTILS ─────────────────────────────────────────────────────────────'
    );
}

if (!content.includes('loadAISettings();')) {
    content = content.replace(
        'loadAllData();',
        'loadAllData();\n            loadAISettings();'
    );
}

if (!content.includes('case \'AI_STATUS_UPDATE\':')) {
    content = content.replace(
        "case 'UPDATE_RESCUE_REQUEST':",
        "case 'AI_STATUS_UPDATE':\n                    handleAIStatusUpdate(data);\n                    break;\n                case 'UPDATE_RESCUE_REQUEST':"
    );
}

// Write it back
fs.writeFileSync(htmlFile, content, 'utf8');
console.log('Frontend AI UI injected successfully.');
