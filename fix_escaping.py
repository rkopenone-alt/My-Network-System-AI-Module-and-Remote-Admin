import os

path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js"
with open(path, "r", encoding="utf8") as f:
    data = f.read()

# Fix fetch line
old_fetch = "await fetch(`\\${API_BASE}/ai/interval`, {"
new_fetch = "await fetch(`\\${API_BASE}/ai/interval`, {".replace("`\\${", "\\`\\${").replace("`,", "\\`,")
data = data.replace(old_fetch, new_fetch)

# Fix inner text
old_inner = "document.getElementById('activeAiIntervalValue').innerText = `\\${val} \\${unit}`;"
new_inner = "document.getElementById('activeAiIntervalValue').innerText = `\\${val} \\${unit}`;".replace("`\\${", "\\`\\${").replace("`;", "\\`;")
data = data.replace(old_inner, new_inner)

# Fix toast
old_toast = "showAdminToast(`AI Engine Interval updated to \\${val} \\${unit}`);"
new_toast = "showAdminToast(`AI Engine Interval updated to \\${val} \\${unit}`);".replace("`AI", "\\`AI").replace("`);", "\\`);")
data = data.replace(old_toast, new_toast)

with open(path, "w", encoding="utf8") as f:
    f.write(data)
print("Fixed escaping")
