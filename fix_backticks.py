import os

path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js"
with open(path, "r", encoding="utf8") as f:
    data = f.read()

data = data.replace(
    r"await fetch(`\${API_BASE}/ai/interval`, {",
    "await fetch(\\`\\${API_BASE}/ai/interval\\`, {"
)

data = data.replace(
    r"document.getElementById('activeAiIntervalValue').innerText = `\${val} \${unit}`;",
    "document.getElementById('activeAiIntervalValue').innerText = \\`\\${val} \\${unit}\\`;"
)

data = data.replace(
    r"showAdminToast(`AI Engine Interval updated to \${val} \${unit}`);",
    "showAdminToast(\\`AI Engine Interval updated to \\${val} \\${unit}\\`);"
)

data = data.replace(
    r"console.log(`[Admin] Background polling enabled: ${seconds} seconds.`);",
    "console.log(\\`[Admin] Background polling enabled: \\${seconds} seconds.\\`);"
)

data = data.replace(
    r"console.log(`[Admin] Background polling disabled. Relying purely on WebSocket pushes for real-time updates.`);",
    "console.log(\\`[Admin] Background polling disabled. Relying purely on WebSocket pushes for real-time updates.\\`);"
)

with open(path, "w", encoding="utf8") as f:
    f.write(data)
print("Escaped backticks fixed!")
