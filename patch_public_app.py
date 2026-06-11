import os

path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\public-sos-app\App.js"
with open(path, "r", encoding="utf8") as f:
    data = f.read()

# Add quality: 0.5 to ImagePicker.launchCameraAsync
old_cam1 = """            let result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });"""
new_cam1 = """            let result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.5,
            });"""
data = data.replace(old_cam1, new_cam1)

# Add quality: 0.5 to ImagePicker.launchImageLibraryAsync
old_lib1 = """            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });"""
new_lib1 = """            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.5,
            });"""
data = data.replace(old_lib1, new_lib1)

with open(path, "w", encoding="utf8") as f:
    f.write(data)
print("Public App App.js patched!")
