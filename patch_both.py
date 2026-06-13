import re
import os

stop_recording_func = """
  const stopRecording = async (cancel = false) => {
    setIsProcessingAudio(true);
    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    if (audioRecordingRef.current) {
      try {
        await audioRecordingRef.current.stopAndUnloadAsync();
        if (!cancel) {
          const uri = audioRecordingRef.current.getURI();
          // Read base64
          // We can't use FileSystem here if not imported, but wait, it's imported at top.
          const base64Str = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          setAudioBase64(`data:audio/m4a;base64,${base64Str}`);
          setAttachments(prev => ({ ...prev, voice: true }));
          Alert.alert('Success', 'Voice note recorded and attached successfully!');
        } else {
          setAudioBase64(null);
          setAttachments(prev => ({ ...prev, voice: false }));
        }
      } catch (e) {
        console.error(e);
        if (!cancel) Alert.alert('Error', 'Failed to save recording');
      }
      audioRecordingRef.current = null;
    }
    setIsRecordingUI(false);
    setIsProcessingAudio(false);
  };
"""

app_js_path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\public-sos-app\App.js"
with open(app_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Insert in RequirementsScreen (after audioTimerRef.current)
if "const stopRecording =" not in content.split("function RequirementsScreen")[1].split("return")[0]:
    content = content.replace("const audioTimerRef = useRef(null);", f"const audioTimerRef = useRef(null);\n{stop_recording_func}")

# Insert in SOSTriggerScreen
if "const stopRecording =" not in content.split("function SOSTriggerScreen")[1].split("return")[0]:
    content = content.replace("const audioTimerRef = useRef(null);", f"const audioTimerRef = useRef(null);\n{stop_recording_func}")

with open(app_js_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("public-sos-app patched.")
