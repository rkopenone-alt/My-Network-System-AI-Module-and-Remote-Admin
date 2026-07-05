import os
import shutil

# 1. Copy the new icon (the correct media ID)
src_png = r"C:\Users\Alienware\.gemini\antigravity\brain\6c09af15-0041-4dc9-98e1-26cd110ef2ab\media__1783249383567.png"
assets_dir = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\public-sos-app\assets"

if os.path.exists(src_png):
    shutil.copy(src_png, os.path.join(assets_dir, "icon.png"))
    shutil.copy(src_png, os.path.join(assets_dir, "adaptive-icon.png"))
    shutil.copy(src_png, os.path.join(assets_dir, "favicon.png"))
    shutil.copy(src_png, os.path.join(assets_dir, "splash-icon.png"))
    shutil.copy(src_png, os.path.join(assets_dir, "splash.png"))
    print("New icon copied to assets directory.")
else:
    print("Error: Source PNG not found at", src_png)

# 2. Modify build_public_apk.py to temporarily remove mipmap-anydpi-v26
build_script_path = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\build_public_apk.py"
with open(build_script_path, "r", encoding="utf-8") as f:
    content = f.read()

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
print("build_public_apk.py updated to handle mipmap-anydpi-v26.")
