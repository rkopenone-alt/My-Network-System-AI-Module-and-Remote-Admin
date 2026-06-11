import os
import re

def patch_refresh(path):
    with open(path, "r", encoding="utf8") as f:
        data = f.read()

    # Find the startAutoRefresh function using regex to be safe
    pattern = r"function startAutoRefresh\(seconds\) \{[\s\S]*?console\.log\(`\[Admin\] Background polling disabled\. Relying purely on WebSocket pushes for real-time updates\.`\);"
    
    new_code = """function startAutoRefresh(seconds) {
              if (refreshTimer) clearInterval(refreshTimer);
              if (seconds && seconds > 0) {
                  refreshTimer = setInterval(() => {
                      refreshAllModules();
                  }, seconds * 1000);
                  console.log(`[Admin] Background polling enabled: ${seconds} seconds.`);
              } else {
                  console.log(`[Admin] Background polling disabled. Relying purely on WebSocket pushes for real-time updates.`);
              }"""

    if re.search(pattern, data):
        data = re.sub(pattern, new_code, data, count=1)
        with open(path, "w", encoding="utf8") as f:
            f.write(data)
        print(f"Patched {path}")
    else:
        print(f"Could not find pattern in {path}")

patch_refresh(r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\system-backend\public\Web ADMIN.html")
patch_refresh(r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js")
