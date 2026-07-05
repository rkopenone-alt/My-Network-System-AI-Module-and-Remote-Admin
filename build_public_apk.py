import os
import shutil
import subprocess
from PIL import Image, ImageOps

rescuer_dir = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\rescuer-app"
admin_dir = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\public-sos-app"
output_dir = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\Output_APKs"

# 1. Backup rescuer-app files
shutil.copy(os.path.join(rescuer_dir, "htmlStr.js"), os.path.join(rescuer_dir, "htmlStr.js_bak.txt"))
shutil.copy(os.path.join(rescuer_dir, "app.json"), os.path.join(rescuer_dir, "app.json_bak.txt"))
shutil.copy(os.path.join(rescuer_dir, "App.js"), os.path.join(rescuer_dir, "App.js_bak.txt"))

strings_xml = os.path.join(rescuer_dir, "android", "app", "src", "main", "res", "values", "strings.xml")
with open(strings_xml, 'r', encoding='utf-8') as f:
    strings_content = f.read()
with open(os.path.join(rescuer_dir, 'strings_bak.txt'), 'w', encoding='utf-8') as f:
    f.write(strings_content)

manifest_xml = os.path.join(rescuer_dir, "android", "app", "src", "main", "AndroidManifest.xml")
with open(manifest_xml, 'r', encoding='utf-8') as f:
    manifest_content = f.read()
with open(os.path.join(rescuer_dir, 'manifest_bak.txt'), 'w', encoding='utf-8') as f:
    f.write(manifest_content)

build_gradle = os.path.join(rescuer_dir, "android", "app", "build.gradle")
with open(build_gradle, 'r', encoding='utf-8') as f:
    gradle_content = f.read()
with open(os.path.join(rescuer_dir, 'gradle_bak.txt'), 'w', encoding='utf-8') as f:
    f.write(gradle_content)

# 2. Inject admin-app files & patch configuration
shutil.copy(os.path.join(admin_dir, "htmlStr.js"), os.path.join(rescuer_dir, "htmlStr.js"))
shutil.copy(os.path.join(admin_dir, "app.json"), os.path.join(rescuer_dir, "app.json"))
shutil.copy(os.path.join(admin_dir, "App.js"), os.path.join(rescuer_dir, "App.js"))

import re
new_strings = re.sub(r'<string name="app_name">.*?</string>', '<string name="app_name">Public SOS Rescue</string>', strings_content)
with open(strings_xml, 'w', encoding='utf-8') as f:
    f.write(new_strings)

new_gradle = re.sub(r"applicationId\s+['\"].*?['\"]", "applicationId 'com.rescue.public'", gradle_content)
with open(build_gradle, 'w', encoding='utf-8') as f:
    f.write(new_gradle)

new_manifest = manifest_content.replace('android:screenOrientation="portrait"', 'android:screenOrientation="unspecified"')
with open(manifest_xml, 'w', encoding='utf-8') as f:
    f.write(new_manifest)
# Inject custom Admin App Icons
import glob
from PIL import Image

anydpi_dir = os.path.join(rescuer_dir, "android", "app", "src", "main", "res", "mipmap-anydpi-v26")
anydpi_bak = os.path.join(rescuer_dir, "android", "app", "src", "main", "res_backup_anydpi")
if os.path.exists(anydpi_dir):
    shutil.move(anydpi_dir, anydpi_bak)

icon_source = os.path.join(admin_dir, "assets", "icon.png")
backup_dir = os.path.join(rescuer_dir, "android", "app", "src", "main", "res_backup")
if not os.path.exists(backup_dir):
    os.makedirs(backup_dir)

if os.path.exists(icon_source):
    sizes = {
        "mipmap-mdpi": (48, 48),
        "mipmap-hdpi": (72, 72),
        "mipmap-xhdpi": (96, 96),
        "mipmap-xxhdpi": (144, 144),
        "mipmap-xxxhdpi": (192, 192),
    }
    
    img = Image.open(icon_source).convert("RGBA")
    
    for mipmap_folder, size in sizes.items():
        dest_folder = os.path.join(rescuer_dir, "android", "app", "src", "main", "res", mipmap_folder)
        backup_mipmap = os.path.join(backup_dir, mipmap_folder)
        os.makedirs(backup_mipmap, exist_ok=True)
        
        if os.path.exists(dest_folder):
            for shape in ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]:
                icon_path = os.path.join(dest_folder, shape)
                backup_path = os.path.join(backup_mipmap, shape)
                if os.path.exists(icon_path):
                    shutil.copy(icon_path, backup_path)
                    resized = img.resize(size, Image.Resampling.LANCZOS)
                    resized.save(icon_path)
                    print(f"Injected custom icon to {icon_path}")

# 3. Build APK
print("Building APK...")
cwd = os.path.join(rescuer_dir, "android")
env = os.environ.copy()
env["JAVA_HOME"] = r"C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
env["ANDROID_HOME"] = r"C:\Users\Alienware\AppData\Local\Android\Sdk"
# Clean first to prevent incremental bugs
subprocess.run([".\\gradlew.bat", "clean"], cwd=cwd, env=env, shell=True)
result = subprocess.run([".\\gradlew.bat", "assembleRelease"], cwd=cwd, env=env, shell=True)

if result.returncode == 0:
    apk_path = os.path.join(cwd, "app", "build", "outputs", "apk", "release", "app-release.apk")
    if os.path.exists(apk_path):
        os.makedirs(output_dir, exist_ok=True)
        shutil.copy(apk_path, os.path.join(output_dir, "Public_SOS_App.apk"))
        print("Public APK successfully built and copied to Output_APKs.")
else:
    print("Build failed!")

# 4. Restore backups
shutil.move(os.path.join(rescuer_dir, "htmlStr.js_bak.txt"), os.path.join(rescuer_dir, "htmlStr.js"))
shutil.move(os.path.join(rescuer_dir, "app.json_bak.txt"), os.path.join(rescuer_dir, "app.json"))
shutil.move(os.path.join(rescuer_dir, "App.js_bak.txt"), os.path.join(rescuer_dir, "App.js"))
shutil.move(os.path.join(rescuer_dir, 'strings_bak.txt'), strings_xml)
shutil.move(os.path.join(rescuer_dir, 'gradle_bak.txt'), build_gradle)
shutil.move(os.path.join(rescuer_dir, 'manifest_bak.txt'), manifest_xml)

for mipmap_folder in os.listdir(backup_dir):
    src_folder = os.path.join(backup_dir, mipmap_folder)
    dest_folder = os.path.join(rescuer_dir, "android", "app", "src", "main", "res", mipmap_folder)
    for shape in os.listdir(src_folder):
        shutil.copy(os.path.join(src_folder, shape), os.path.join(dest_folder, shape))
shutil.rmtree(backup_dir)

if os.path.exists(anydpi_bak):
    shutil.move(anydpi_bak, anydpi_dir)
    
print("Restored rescuer-app to original state.")
