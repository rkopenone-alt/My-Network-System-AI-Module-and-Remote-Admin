import os
import shutil

rescuer_dir = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\rescuer-app"
backup_dir = os.path.join(rescuer_dir, "android", "app", "src", "main", "res_backup")
strings_xml = os.path.join(rescuer_dir, "android", "app", "src", "main", "res", "values", "strings.xml")
build_gradle = os.path.join(rescuer_dir, "android", "app", "build.gradle")
manifest_xml = os.path.join(rescuer_dir, "android", "app", "src", "main", "AndroidManifest.xml")

shutil.move(os.path.join(rescuer_dir, "htmlStr.js_bak.txt"), os.path.join(rescuer_dir, "htmlStr.js"))
shutil.move(os.path.join(rescuer_dir, "app.json_bak.txt"), os.path.join(rescuer_dir, "app.json"))
shutil.move(os.path.join(rescuer_dir, "App.js_bak.txt"), os.path.join(rescuer_dir, "App.js"))
shutil.move(os.path.join(rescuer_dir, 'strings_bak.txt'), strings_xml)
shutil.move(os.path.join(rescuer_dir, 'gradle_bak.txt'), build_gradle)
shutil.move(os.path.join(rescuer_dir, 'manifest_bak.txt'), manifest_xml)

if os.path.exists(backup_dir):
    for mipmap_folder in os.listdir(backup_dir):
        src_folder = os.path.join(backup_dir, mipmap_folder)
        dest_folder = os.path.join(rescuer_dir, "android", "app", "src", "main", "res", mipmap_folder)
        for shape in os.listdir(src_folder):
            shutil.copy(os.path.join(src_folder, shape), os.path.join(dest_folder, shape))
    shutil.rmtree(backup_dir)
print("Restored rescuer-app to original state.")
