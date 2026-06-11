import os
import re

def patch_refresh(path):
    with open(path, "r", encoding="utf8") as f:
        data = f.read()

    # Find the startAutoRefresh function using regex
    pattern = r"function startAutoRefresh\(seconds\) \{[\s\S]*?console\.log\([^;]+;\s*const runAll = \(\) => \{"
    
    new_code = """function startAutoRefresh(seconds) {
              if (refreshTimer) clearInterval(refreshTimer);
              const runAll = () => {"""

    if re.search(pattern, data):
        data = re.sub(pattern, new_code, data, count=1)
        with open(path, "w", encoding="utf8") as f:
            f.write(data)
        print(f"Patched {path}")
    else:
        print(f"Could not find pattern in {path}")

patch_refresh(r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js")
