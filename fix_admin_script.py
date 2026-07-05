import os
import shutil
import base64
import re

admin_icon = r"C:\Users\Alienware\.gemini\antigravity\brain\6c09af15-0041-4dc9-98e1-26cd110ef2ab\media__1783249879504.png"
admin_dir = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\assets"
raw_admin = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\raw_admin.html"

# 1. Copy icons
if os.path.exists(admin_icon):
    shutil.copy(admin_icon, os.path.join(admin_dir, "icon.png"))
    shutil.copy(admin_icon, os.path.join(admin_dir, "adaptive-icon.png"))
    shutil.copy(admin_icon, os.path.join(admin_dir, "favicon.png"))
    shutil.copy(admin_dir + r"\icon.png", os.path.join(admin_dir, "splash-icon.png"))
    shutil.copy(admin_dir + r"\icon.png", os.path.join(admin_dir, "splash.png"))
    
    # Get base64
    with open(admin_icon, "rb") as img:
        b64_str = base64.b64encode(img.read()).decode("utf-8")
        b64_src = f"data:image/png;base64,{b64_str}"
else:
    print("Icon not found!")
    exit(1)

# 2. Update raw_admin.html
with open(raw_admin, "r", encoding="utf-8") as f:
    html = f.read()

# Replace the shield icon with the base64 image in operationalHub
old_icon_html = """<div
                        style="width: 80px; height: 80px; background: #eff6ff; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin-bottom: 32px; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.1);">
                        <img id="landingLogoImg" src="" style="display:none; max-width: 50px; max-height: 50px;">
                        <i id="landingLogoIcon" data-lucide="shield"
                            style="color:var(--accent); width: 40px; height: 40px;"></i>
                    </div>"""

new_icon_html = f"""<div
                        style="width: 100px; height: 100px; background: transparent; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin-bottom: 32px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                        <img src="{b64_src}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 20px;">
                    </div>"""

if '<i id="landingLogoIcon" data-lucide="shield"' in html:
    html = html.replace(old_icon_html, new_icon_html)
    
# Add mobile responsive CSS
if "#operationalHub {" not in html.split("@media (max-width: 1024px) {")[1]:
    css_to_add = """
            #operationalHub {
                flex-direction: column !important;
                overflow-y: auto !important;
                position: absolute !important;
            }
            .hub-side-panel {
                width: 100% !important;
                min-width: unset !important;
                height: auto !important;
                min-height: 100vh !important;
                padding: 40px 24px !important;
                border-right: none !important;
            }
            .hub-main-content {
                display: none !important;
            }
"""
    html = html.replace("@media (max-width: 1024px) {", "@media (max-width: 1024px) {" + css_to_add, 1)

with open(raw_admin, "w", encoding="utf-8") as f:
    f.write(html)
print("raw_admin.html updated with base64 icon and responsive layout.")

# 3. Update build_admin_apk.py to remove mipmap-anydpi-v26
build_script_path = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\build_admin_apk.py"
with open(build_script_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add ic_launcher_foreground.png to loop
if '["ic_launcher.png", "ic_launcher_round.png"]' in content:
    content = content.replace('["ic_launcher.png", "ic_launcher_round.png"]', '["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]')

# Remove adaptive XML
anydpi_backup_code = """
# Inject custom Admin App Icons
import glob
from PIL import Image

anydpi_dir = os.path.join(rescuer_dir, "android", "app", "src", "main", "res", "mipmap-anydpi-v26")
anydpi_bak = os.path.join(rescuer_dir, "android", "app", "src", "main", "res_backup_anydpi")
if os.path.exists(anydpi_dir):
    shutil.move(anydpi_dir, anydpi_bak)
"""

if "shutil.move(anydpi_dir, anydpi_bak)" not in content:
    content = content.replace("# Inject custom Admin App Icons\nimport glob\nfrom PIL import Image", anydpi_backup_code.strip())

anydpi_restore_code = """
for mipmap_folder in os.listdir(backup_dir):
    src_folder = os.path.join(backup_dir, mipmap_folder)
    dest_folder = os.path.join(rescuer_dir, "android", "app", "src", "main", "res", mipmap_folder)
    for shape in os.listdir(src_folder):
        shutil.copy(os.path.join(src_folder, shape), os.path.join(dest_folder, shape))
shutil.rmtree(backup_dir)

if os.path.exists(anydpi_bak):
    shutil.move(anydpi_bak, anydpi_dir)
"""

if "shutil.move(anydpi_bak, anydpi_dir)" not in content:
    old_restore = """
for mipmap_folder in os.listdir(backup_dir):
    src_folder = os.path.join(backup_dir, mipmap_folder)
    dest_folder = os.path.join(rescuer_dir, "android", "app", "src", "main", "res", mipmap_folder)
    for shape in os.listdir(src_folder):
        shutil.copy(os.path.join(src_folder, shape), os.path.join(dest_folder, shape))
shutil.rmtree(backup_dir)
"""
    content = content.replace(old_restore.strip(), anydpi_restore_code.strip())

with open(build_script_path, "w", encoding="utf-8") as f:
    f.write(content)
print("build_admin_apk.py updated.")

