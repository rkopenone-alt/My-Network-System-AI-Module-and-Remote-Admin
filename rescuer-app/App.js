import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, PermissionsAndroid, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { htmlString } from './htmlStr';

// ─── Server Configuration ─────────────────────────────────────────────────────
// Update SERVER_IP to your machine's Wi-Fi IP address.
// Run: ipconfig  → look for IPv4 Address under Wi-Fi
const SERVER_IP = '192.168.1.4';
const SERVER_PORT = '3001';
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [serverIp, setServerIp] = useState(SERVER_IP);
  const webViewRef = useRef(null);


  useEffect(() => {
    let locationSubscription = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        try {
          const initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          if (webViewRef.current) {
            const payload = JSON.stringify({
              type: 'GPS_UPDATE',
              lat: initialLoc.coords.latitude,
              lng: initialLoc.coords.longitude
            });
            webViewRef.current.injectJavaScript(`window.postMessage(${payload}, '*'); true;`);
          }
        } catch (e) {}

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 1,
          },
          (loc) => {
            if (webViewRef.current) {
              const payload = JSON.stringify({
                type: 'GPS_UPDATE',
                lat: loc.coords.latitude,
                lng: loc.coords.longitude
              });
              webViewRef.current.injectJavaScript(`window.postMessage(${payload}, '*'); true;`);
            }
          }
        );
      }
    })();
    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  // Inject the server IP into the WebView as a global variable
  // This runs BEFORE any page scripts so core.API can use it
  const injectedJavaScript = `
    window.__SERVER_IP__ = '${serverIp}';
    window.__SERVER_PORT__ = '${SERVER_PORT}';
    window.__API_BASE__ = 'http://${serverIp}:${SERVER_PORT}/api';
    window.__WS_BASE__ = 'ws://${serverIp}:${SERVER_PORT}';
    true;
  `;

  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Initializing Rescuer System...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 20 }}>
        <Text style={{ color: '#f43f5e', fontSize: 18, textAlign: 'center' }}>
          Location permissions are strictly required for the Field Rescuer App to function. Please enable them in your device settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlString, baseUrl: `http://${serverIp}:${SERVER_PORT}` }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
        onMessage={async (event) => {
          // Handle messages from WebView back to native if needed
          try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('[WebView Message]', data);

            if (data.type === 'CAPTURE_IMAGE') {
              try {
                // Request camera permission dynamically at runtime
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission Denied', 'Camera permission is required to capture photos.');
                  return;
                }

                // Launch native camera
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ['images'],
                  allowsEditing: true,
                });

                if (!result.canceled && result.assets && result.assets.length > 0) {
                  const asset = result.assets[0];
                  
                  // 1. Initial compression: resize width to 1024px, JPEG quality to 60%
                  let manipResult = await ImageManipulator.manipulateAsync(
                    asset.uri,
                    [{ resize: { width: 1024 } }],
                    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                  );
                  
                  let sizeBytes = Math.round(manipResult.base64.length * 0.75);
                  
                  // 2. If still > 200KB, second pass
                  if (sizeBytes > 200 * 1024) {
                    manipResult = await ImageManipulator.manipulateAsync(
                      asset.uri,
                      [{ resize: { width: 800 } }],
                      { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                    );
                    sizeBytes = Math.round(manipResult.base64.length * 0.75);
                  }
                  
                  // 3. If still > 200KB, third pass
                  if (sizeBytes > 200 * 1024) {
                    manipResult = await ImageManipulator.manipulateAsync(
                      asset.uri,
                      [{ resize: { width: 640 } }],
                      { compress: 0.15, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                    );
                    sizeBytes = Math.round(manipResult.base64.length * 0.75);
                  }
                  
                  if (sizeBytes > 200 * 1024) {
                    Alert.alert('Compression Warning', `Photo is ${Math.round(sizeBytes / 1024)} KB, which exceeds the 200 KB limit. Please try again.`);
                    return;
                  }
                  
                  let base64Str = manipResult.base64;
                  if (base64Str) {
                    if (!base64Str.startsWith('data:')) {
                      base64Str = 'data:image/jpeg;base64,' + base64Str;
                    }
                    // Inject back into the WebView global handler
                    const code = `if (window.onImageCaptured) { window.onImageCaptured('${base64Str}', '${data.taskId}'); } true;`;
                    if (webViewRef.current) {
                      webViewRef.current.injectJavaScript(code);
                    }
                  }
                }
              } catch (err) {
                console.error('[Native Camera Error]', err);
                Alert.alert('Error', 'Failed to capture or process photo.');
              }
            }

            if (data.type === 'DOWNLOAD_PDF' && data.base64) {
              const filename = data.filename || 'Mission_History.pdf';
              const fileUri = FileSystem.documentDirectory + filename;
              const base64Code = data.base64.split(',')[1] || data.base64;
              
              await FileSystem.writeAsStringAsync(fileUri, base64Code, {
                encoding: FileSystem.EncodingType.Base64,
              });
              
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
              } else {
                alert('Sharing is not available on this device');
              }
            }
          } catch (e) {}
        }}
      />
    </View>
  );
}
