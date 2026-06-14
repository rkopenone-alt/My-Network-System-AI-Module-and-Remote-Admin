import os
import re

files = [
    r'c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\system-backend\public\Web ADMIN.html',
    r'c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js'
]

for fpath in files:
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Correct Name Display
    content = content.replace("assignedTo = `ðŸ‘¤ ${req.assigned_officer_name}`;", "assignedTo = `${req.assigned_officer_name}`;")
    content = content.replace("assignedTo = `ðŸ‘¥ ${req.assigned_group_name}`;", "assignedTo = `${req.assigned_group_name}`;")
    content = content.replace("assignedTo = `ðŸ‘¤ ${r.assigned_officer_name}`;", "assignedTo = `${r.assigned_officer_name}`;")
    content = content.replace("assignedTo = `ðŸ‘¥ ${r.assigned_group_name}`;", "assignedTo = `${r.assigned_group_name}`;")
    content = content.replace("assignedTo = `ðŸ‘¤ ${c.assigned_officer_name}`;", "assignedTo = `${c.assigned_officer_name}`;")
    
    # Also handle the label where it might have emoji prefix
    content = content.replace("`ðŸ¤– AI`", "`AI`").replace("'ðŸ¤– AI'", "'AI'")
    content = content.replace("`ðŸ‘¤ Admin`", "`Admin`").replace("'ðŸ‘¤ Admin'", "'Admin'")

    # 2. Remove Swal.fire for AI_ASSIGNED and RESCUE_REQUEST_DECLINED_REASSIGN
    content = re.sub(r"if \(data\.type === 'AI_ASSIGNED'\)\s*\{\s*Swal\.fire\(\{[\s\S]*?\}\);", "if (data.type === 'AI_ASSIGNED') {", content)
    content = re.sub(r"if \(data\.type === 'RESCUE_REQUEST_DECLINED_REASSIGN'\)\s*\{\s*Swal\.fire\(\{[\s\S]*?\}\);", "if (data.type === 'RESCUE_REQUEST_DECLINED_REASSIGN') {", content)

    # 3. Responsive UI
    content = content.replace('content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"', 'content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"')
    
    # 5. Heartbeat logic
    ws_add = """
        socket.onmessage = function (event) {
            if (event.data === 'ping') {
                socket.send('pong');
                return;
            }
"""
    if "socket.onmessage = function (event) {" in content and "if (event.data === 'ping')" not in content:
        content = content.replace("socket.onmessage = function (event) {", ws_add)

    css_add = """
    .table-container, .table-responsive {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        width: 100%;
    }
"""
    if "/* Custom Scrollbar */" in content and ".table-responsive" not in content:
        content = content.replace("/* Custom Scrollbar */", css_add + "\n/* Custom Scrollbar */")

    content = content.replace('<div class="history-content">', '<div class="history-content table-responsive">')
    content = content.replace('<div class="task-list">', '<div class="task-list table-responsive">')

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("HTML UI Fixed")
