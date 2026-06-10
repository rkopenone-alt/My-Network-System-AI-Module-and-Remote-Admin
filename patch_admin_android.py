import os

android_dir = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\android"

for root, dirs, files in os.walk(android_dir):
    for file in files:
        if file.endswith(".xml") or file.endswith(".gradle") or file.endswith(".java") or file.endswith(".kt") or file.endswith(".json"):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content.replace('com.rescue.rescuer', 'com.rescue.admin').replace('AntiGravity Rescuer', 'AntiGravity Admin').replace('rescuer-app', 'admin-app')
                
                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
            except:
                pass
print("Android names patched.")
