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

# Replace the first instance in RequirementsScreen
req_idx = content.find("function RequirementsScreen")
if req_idx != -1:
    idx = content.find("const audioTimerRef = useRef(null);", req_idx)
    if idx != -1 and "const stopRecording =" not in content[req_idx:idx+1000]:
        content = content[:idx] + f"const audioTimerRef = useRef(null);\n{stop_recording_func}" + content[idx + len("const audioTimerRef = useRef(null);"):]

# Replace the first instance in SOSTriggerScreen
sos_idx = content.find("function SOSTriggerScreen")
if sos_idx != -1:
    idx = content.find("const audioTimerRef = useRef(null);", sos_idx)
    if idx != -1 and "const stopRecording =" not in content[sos_idx:idx+1000]:
        content = content[:idx] + f"const audioTimerRef = useRef(null);\n{stop_recording_func}" + content[idx + len("const audioTimerRef = useRef(null);"):]

with open(app_js_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Safely patched.")
