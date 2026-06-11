import os

path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js"
with open(path, "r", encoding="utf8") as f:
    data = f.read()

# I want the final file to have:
# await fetch(`\${API_BASE}/ai/interval`, {
data = data.replace(r"await fetch(`\${API_BASE}/ai/interval`, {", r"await fetch(`\${API_BASE}/ai/interval`, {") # Wait this does nothing.

# Let's replace the CURRENT state which has `\\${` (literally backslash backslash dollar brace)
data = data.replace(r"await fetch(`\\${API_BASE}/ai/interval`, {", r"await fetch(`\${API_BASE}/ai/interval`, {")
data = data.replace(r"document.getElementById('activeAiIntervalValue').innerText = `\\${val} \\${unit}`;", r"document.getElementById('activeAiIntervalValue').innerText = `\${val} \${unit}`;")
data = data.replace(r"showAdminToast(`AI Engine Interval updated to \\${val} \\${unit}`);", r"showAdminToast(`AI Engine Interval updated to \${val} \${unit}`);")

with open(path, "w", encoding="utf8") as f:
    f.write(data)
print("Fixed escaping back to single slash")
