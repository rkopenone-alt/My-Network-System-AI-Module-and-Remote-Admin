import os
import shutil
import subprocess

workspace_dir = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026"
output_dir = os.path.join(workspace_dir, "Output_APKs")

env = os.environ.copy()
env["JAVA_HOME"] = r"C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
env["ANDROID_HOME"] = r"C:\Users\Alienware\AppData\Local\Android\Sdk"

def build_app(app_name, output_name):
    print(f"Building {app_name}...")
    cwd = os.path.join(workspace_dir, app_name, "android")
    app_dir = os.path.join(workspace_dir, app_name)
    
    # FORCE STRINGS AND ICONS TO AVOID CORRUPTED CACHE FROM FAILED PUBLIC BUILDS
    strings_xml = os.path.join(app_dir, "android", "app", "src", "main", "res", "values", "strings.xml")
    if os.path.exists(strings_xml):
        with open(strings_xml, "r", encoding="utf-8") as f:
            content = f.read()
        import re
        content = re.sub(r'<string name="app_name">.*?</string>', '<string name="app_name">Rescuer Field App</string>', content)
        with open(strings_xml, "w", encoding="utf-8") as f:
            f.write(content)
            
    # FORCE ICONS
    import glob
    from PIL import Image
    icon_source = os.path.join(app_dir, "assets", "official_rescuer_icon.png")
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
            dest_folder = os.path.join(app_dir, "android", "app", "src", "main", "res", mipmap_folder)
            if os.path.exists(dest_folder):
                for shape in ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]:
                    icon_path = os.path.join(dest_folder, shape)
                    if os.path.exists(icon_path):
                        resized = img.resize(size, Image.Resampling.LANCZOS)
                        resized.save(icon_path)

    print("Cleaning Metro bundler caches...")
    subprocess.run(["rmdir", "/S", "/Q", ".expo"], cwd=app_dir, shell=True)
    subprocess.run(["rmdir", "/S", "/Q", "node_modules\\.cache"], cwd=app_dir, shell=True)
    subprocess.run(["rmdir", "/S", "/Q", r"%TMP%\metro-cache"], shell=True)
    subprocess.run([".\\gradlew.bat", "clean"], cwd=cwd, env=env, shell=True)
    res = subprocess.run([".\\gradlew.bat", "assembleRelease"], cwd=cwd, env=env, shell=True)
    if res.returncode == 0:
        apk_path = os.path.join(cwd, "app", "build", "outputs", "apk", "release", "app-release.apk")
        if os.path.exists(apk_path):
            os.makedirs(output_dir, exist_ok=True)
            shutil.copy(apk_path, os.path.join(output_dir, output_name))
            print(f"Successfully built and copied {output_name}")
        else:
            print(f"Failed to find {apk_path}")
    else:
        print(f"Failed to build {app_name}")

build_app("rescuer-app", "Rescuer_App_Rescue_AI.apk")
