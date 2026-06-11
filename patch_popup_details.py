import os
import re

def patch_details(path):
    with open(path, "r", encoding="utf8") as f:
        data = f.read()

    # Find the showSosAlertModal function
    pattern = r"document\.getElementById\('sosAlertDetails'\)\.innerText = data\.details \|\| 'Emergency SOS triggered from public device\.';"
    
    new_code = """
            let detailsStr = data.details || 'Emergency SOS triggered from public device.';
            try {
                const parsed = JSON.parse(data.details);
                if (parsed && typeof parsed === 'object') {
                    let parts = [];
                    if (parsed.comments) parts.push(`Comments: ${parsed.comments}`);
                    if (parsed.people) parts.push(`People: ${parsed.people}`);
                    if (parsed.food) parts.push(`Food: ${parsed.food}`);
                    if (parsed.med) parts.push(`Medical: ${parsed.med}`);
                    if (parsed.sanitary) parts.push(`Sanitary: ${parsed.sanitary}`);
                    if (parsed.transportMode) parts.push(`Transport: ${parsed.transportMode}`);
                    if (parsed.lat && parsed.lng) parts.push(`Location: ${parsed.lat}, ${parsed.lng}`);
                    if (parts.length > 0) detailsStr = parts.join('\\n');
                }
            } catch (e) {}
            document.getElementById('sosAlertDetails').innerText = detailsStr;
    """

    if re.search(pattern, data):
        data = re.sub(pattern, new_code, data, count=1)
        with open(path, "w", encoding="utf8") as f:
            f.write(data)
        print(f"Patched {path}")
    else:
        print(f"Could not find pattern in {path}")

patch_details(r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\system-backend\public\Web ADMIN.html")
patch_details(r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js")
