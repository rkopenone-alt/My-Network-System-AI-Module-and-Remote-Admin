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
