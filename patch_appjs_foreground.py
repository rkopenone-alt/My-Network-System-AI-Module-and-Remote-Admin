import os
import re

app_js_path = r'c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\rescuer-app\App.js'

with open(app_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
imports_to_add = """
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { useKeepAwake } from 'expo-keep-awake';
"""
if "import * as TaskManager" not in content:
    content = content.replace("import { Audio } from 'expo-av';", "import { Audio } from 'expo-av';\n" + imports_to_add)

# Add TaskManager definition
task_manager_code = """
const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  if (error) {
    console.error('[TaskManager] Error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    // We don't necessarily need to post this to WebView if we only want to keep the thread alive,
    // but the task execution keeps the React Native JS thread awake!
    console.log('[TaskManager] Background location received:', locations[0].coords);
  }
});
"""
if "const BACKGROUND_LOCATION_TASK" not in content:
    content = content.replace("export default function App() {", task_manager_code + "\nexport default function App() {\n  useKeepAwake();\n")

# Update Permissions Request to include background permissions
background_req_code = """
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        const bgStatus = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus.status === 'granted') {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 1,
            foregroundService: {
              notificationTitle: "Rescue Officer Active",
              notificationBody: "Listening for dispatch commands",
              notificationColor: "#0ea5e9",
            },
          });
        }
"""
if "await Location.requestBackgroundPermissionsAsync" not in content:
    content = content.replace("""      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {""", background_req_code)

# Add Notifications setup
notif_setup_code = """
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
"""
if "Notifications.setNotificationHandler" not in content:
    content = content.replace("const BACKGROUND_LOCATION_TASK", notif_setup_code + "\nconst BACKGROUND_LOCATION_TASK")

audio_config = """
  useEffect(() => {
    (async () => {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    })();
  }, []);
"""
if "staysActiveInBackground: true" not in content:
    content = content.replace("export default function App() {", "export default function App() {\n" + audio_config)

with open(app_js_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("App.js patched for Foreground Service successfully.")
