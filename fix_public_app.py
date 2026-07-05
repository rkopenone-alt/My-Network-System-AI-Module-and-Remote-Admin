import os
import re
from PIL import Image

# 1. Convert and Copy the Icon
src_jpg = r"C:\Users\Alienware\.gemini\antigravity\brain\6c09af15-0041-4dc9-98e1-26cd110ef2ab\media__1783246194608.jpg"
assets_dir = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\public-sos-app\assets"

if os.path.exists(src_jpg):
    img = Image.open(src_jpg)
    img.save(os.path.join(assets_dir, "icon.png"), "PNG")
    img.save(os.path.join(assets_dir, "adaptive-icon.png"), "PNG")
    img.save(os.path.join(assets_dir, "favicon.png"), "PNG")
    img.save(os.path.join(assets_dir, "splash-icon.png"), "PNG")
    img.save(os.path.join(assets_dir, "splash.png"), "PNG")
    print("Icons converted and copied successfully.")
else:
    print("Source icon JPG not found!")

# 2. Fix App.js audio recording logic
filepath = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\public-sos-app\App.js"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Fix 2.1: Remove setAttachments from stopRecording inside CriticalSOSScreen
# Let's target the stopRecording block inside CriticalSOSScreen.
# To identify the correct stopRecording block, we find the one that has:
# "if (!cancel) {
#   const uri = audioRecordingRef.current.getURI();
#   const base64Str = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
#   setAudioBase64(`data:audio/m4a;base64,${base64Str}`);"
# but also "setAttachments(prev => ({ ...prev, voice: true }));" (which is invalid here)

old_stop_recording = """
        if (!cancel) {
          const uri = audioRecordingRef.current.getURI();
          const base64Str = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          setAudioBase64(`data:audio/m4a;base64,${base64Str}`);
          setAttachments(prev => ({ ...prev, voice: true }));
          Alert.alert('Success', 'Voice note recorded and attached successfully!');
        } else {
          setAudioBase64(null);
          setAttachments(prev => ({ ...prev, voice: false }));
        }
"""

new_stop_recording = """
        if (!cancel) {
          const uri = audioRecordingRef.current.getURI();
          const base64Str = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          setAudioBase64(`data:audio/m4a;base64,${base64Str}`);
          Alert.alert('Success', 'Voice note recorded and attached successfully!');
        } else {
          setAudioBase64(null);
        }
"""

if old_stop_recording.strip() in content:
    content = content.replace(old_stop_recording.strip(), new_stop_recording.strip())
    print("Fixed stopRecording inside CriticalSOSScreen (removed setAttachments).")
else:
    print("WARNING: Could not find old_stop_recording pattern!")

# Fix 2.2: Add <RecordingModal> inside CriticalSOSScreen render return statement.
# Let's find the closing tags of the Main Container of CriticalSOSScreen.
# It should end with </View>\n  );\n}
# Let's inspect where CriticalSOSScreen's main return block ends.
# Usually has:
#       </View>
#     </View>
#   );
# }

# We will search for:
#           </View>
#         </View>
#       </View>
#     </View>
#   );
# }
# and insert the RecordingModal before the closing </View> </View> or at the end.
# A safe place is right before the outer </View> container of the screen.

critical_sos_end_pattern = """
  return (
    <View style={[s.loginBg, { backgroundColor: '#fff5f5', justifyContent: 'flex-start', padding: 0 }]}>
"""

# Let's look for the return block of CriticalSOSScreen and append the RecordingModal right before its last </View>
# To do this safely, we can locate:
#           </View>
#         </View>
#       </View>
#     </View>
#   );
# }
# Wait, let's search for this exact block in App.js using Python to find the index.
# We will do a regex search for the closing of CriticalSOSScreen.
# We can find the text "PRESS TO DISPATCH HQ" and then find the next ");\n}"

dispatch_hq_idx = content.find("PRESS TO DISPATCH HQ")
if dispatch_hq_idx != -1:
    close_idx = content.find(");\n}", dispatch_hq_idx)
    # The return statement should have a closing </View> before the );
    # Let's insert the RecordingModal there.
    # The code looks like:
    #       </View>
    #     </View>
    #   );
    # }
    # We will find the last </View> before close_idx and insert it.
    last_view_idx = content.rfind("</View>", dispatch_hq_idx, close_idx)
    if last_view_idx != -1:
        modal_code = """
      <RecordingModal 
        isRecording={isRecordingUI} 
        recordSeconds={recordSeconds}
        onStop={() => stopRecording(false)} 
        onCancel={() => stopRecording(true)}
        isProcessing={isProcessingAudio}
      />
      """
        content = content[:last_view_idx] + modal_code + "\n      " + content[last_view_idx:]
        print("Inserted RecordingModal into CriticalSOSScreen.")
    else:
        print("WARNING: Could not find closing </View> for CriticalSOSScreen!")
else:
    print("WARNING: Could not find PRESS TO DISPATCH HQ!")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
