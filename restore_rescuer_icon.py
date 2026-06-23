import os
from PIL import Image

rescuer_dir = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\rescuer-app"
icon_source = os.path.join(rescuer_dir, "assets", "official_rescuer_icon.png")

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
        os.makedirs(dest_folder, exist_ok=True)
        
        for shape in ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]:
            icon_path = os.path.join(dest_folder, shape)
            resized = img.resize(size, Image.Resampling.LANCZOS)
            resized.save(icon_path)
            print(f"Restored custom icon to {icon_path}")
print("Finished restoring icons!")
