import os

path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\public-sos-app\App.js"
with open(path, "r", encoding="utf8") as f:
    data = f.read()

# Fix 1: ImagePicker array to enum
data = data.replace("mediaTypes: ['images'],", "mediaTypes: ImagePicker.MediaTypeOptions.Images,")

# Fix 2: Audio limit 100 KB to 200 KB
data = data.replace("Maximum allowed is 100 KB.", "Maximum allowed is 200 KB.")
data = data.replace("blob.size > 100 * 1024", "blob.size > 200 * 1024")
data = data.replace("asset.size > 100 * 1024", "asset.size > 200 * 1024")

with open(path, "w", encoding="utf8") as f:
    f.write(data)
print("public-sos-app App.js patched for media capture limits and ImagePicker crash.")
