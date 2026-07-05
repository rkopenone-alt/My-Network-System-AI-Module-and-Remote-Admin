import os
import shutil

# 1. Copy the new icon
src_png = r"C:\Users\Alienware\.gemini\antigravity\brain\6c09af15-0041-4dc9-98e1-26cd110ef2ab\media__1783249339324.png"
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

# 2. Modify build_public_apk.py to inject into ic_launcher_foreground.png
build_script_path = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\build_public_apk.py"
with open(build_script_path, "r", encoding="utf-8") as f:
    content = f.read()

old_loop = 'for shape in ["ic_launcher.png", "ic_launcher_round.png"]:'
new_loop = 'for shape in ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]:'

if old_loop in content:
    content = content.replace(old_loop, new_loop)
    with open(build_script_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully modified build_public_apk.py to overwrite ic_launcher_foreground.png.")
else:
    if new_loop in content:
        print("build_public_apk.py already modified.")
    else:
        print("Error: Could not find old loop in build_public_apk.py.")

