import os

path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\public-sos-app\App.js"
with open(path, "r", encoding="utf8") as f:
    data = f.read()

# Add quality: 0.5 to ImagePicker.launchCameraAsync
old_cam2 = """            let result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
            });"""
new_cam2 = """            let result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.5,
            });"""
data = data.replace(old_cam2, new_cam2)

# Add quality: 0.5 to ImagePicker.launchImageLibraryAsync
old_lib2 = """            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
            });"""
new_lib2 = """            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.5,
            });"""
data = data.replace(old_lib2, new_lib2)

with open(path, "w", encoding="utf8") as f:
    f.write(data)
print("Public App App.js patched (part 2)!")
