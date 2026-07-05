import os
import shutil
import base64
import re

# Paths to correct icons
public_icon_src = r"C:\Users\Alienware\.gemini\antigravity\brain\6c09af15-0041-4dc9-98e1-26cd110ef2ab\media__1783249081781.jpg"
admin_icon_src = r"C:\Users\Alienware\.gemini\antigravity\brain\6c09af15-0041-4dc9-98e1-26cd110ef2ab\media__1783249928725.png"

public_assets = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\public-sos-app\assets"
admin_assets = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\assets"
raw_admin = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\raw_admin.html"

# 1. Update Public App Assets
if os.path.exists(public_icon_src):
    # Convert JPG to PNG for Public App assets
    from PIL import Image
    img = Image.open(public_icon_src)
    for name in ["icon.png", "adaptive-icon.png", "favicon.png", "splash-icon.png", "splash.png"]:
        img.save(os.path.join(public_assets, name), "PNG")
    print("Correct Public App icon copied to assets.")
else:
    print("Error: Public icon source not found!")

# 2. Update Admin App Assets
if os.path.exists(admin_icon_src):
    # Convert/copy to Admin App assets
    from PIL import Image
    img = Image.open(admin_icon_src)
    for name in ["icon.png", "adaptive-icon.png", "favicon.png", "splash-icon.png", "splash.png"]:
        img.save(os.path.join(admin_assets, name), "PNG")
    print("Correct Admin App icon copied to assets.")
    
    # Get base64 for raw_admin.html
    with open(admin_icon_src, "rb") as f:
        b64_str = base64.b64encode(f.read()).decode("utf-8")
        b64_src = f"data:image/png;base64,{b64_str}"
else:
    print("Error: Admin icon source not found!")
    exit(1)

# 3. Update raw_admin.html with the correct base64 icon
with open(raw_admin, "r", encoding="utf-8") as f:
    html = f.read()

# We need to replace the previous base64 image (which was the screenshot) with the new correct base64 image
# Let's search for the image source in style of <img src="data:image/png;base64,..."> inside the logo container
pattern = r'(<div\s+style="width:\s*100px;\s*height:\s*100px;[^>]*>\s*<img\s+src=")[^"]+(")'
html_new = re.sub(pattern, rf'\g<1>{b64_src}\g<2>', html)

if html_new == html:
    print("Warning: regex pattern for logo update didn't match. Attempting fallback.")
    # Fallback search/replace if structure was slightly different
    # Let's just find the big base64 string inside raw_admin.html
    # Since the previous base64 started with the screenshot's base64, we can look for it
    # The previous base64 starts with "iVBORw0KGgoAAAANSUhEUgAAA1sAAAKFCAYAAAA6f/Pu"
    # We will find the src attribute containing it and replace it.
    html_new = re.sub(r'src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA1sAAAKFCAY[^"]+"', f'src="{b64_src}"', html)

with open(raw_admin, "w", encoding="utf-8") as f:
    f.write(html_new)
print("raw_admin.html updated with correct Admin Icon.")
