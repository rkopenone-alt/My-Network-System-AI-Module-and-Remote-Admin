import re

filepath = r'C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\system-backend\public\Web ADMIN.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Sound Button layout (stack horizontally)
old_layout = 'style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin-right: 16px;"'
new_layout = 'style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px; margin-right: 16px;"'
if old_layout in content:
    content = content.replace(old_layout, new_layout)
    print("Fixed button layout")

# 2. Fix Declined By format to show names
old_declined = """                let declinedMatches = (r.details || '').match(/\\[Declined by Rescuer ID: (.*?)\\]/g);
                if (declinedMatches) {
                    declinedBy = declinedMatches.map(m => m.replace(/\\[Declined by Rescuer ID: |\\]/g, '')).join(', ');
                }"""
new_declined = """                let declinedMatches = (r.details || '').match(/\\[Declined by Rescuer ID: (.*?)\\]/g);
                if (declinedMatches) {
                    declinedBy = declinedMatches.map(m => {
                        const idStr = m.replace(/\\[Declined by Rescuer ID: |\\]/g, '');
                        const u = (window.currentUsers || []).find(x => x.id.toString() === idStr);
                        return u ? (u.name || `Rescuer ${idStr}`) : `Rescuer ${idStr}`;
                    }).join(', ');
                }"""

if old_declined in content:
    content = content.replace(old_declined, new_declined)
    print("Fixed declined by format")
else:
    print("old_declined not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
