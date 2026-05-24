import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, PermissionsAndroid, Platform, Alert, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
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

  // Custom Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const processImageUri = async (uri, taskId) => {
    try {
      let manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      
      let sizeBytes = Math.round(manipResult.base64.length * 0.75);
      
      if (sizeBytes > 200 * 1024) {
        manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        sizeBytes = Math.round(manipResult.base64.length * 0.75);
      }
      
      if (sizeBytes > 200 * 1024) {
        manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 640 } }],
          { compress: 0.15, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        sizeBytes = Math.round(manipResult.base64.length * 0.75);
      }
      
      if (sizeBytes > 200 * 1024) {
        Alert.alert('Compression Warning', `Photo exceeds the limit. Please try again.`);
        return;
      }
      
      let base64Str = manipResult.base64;
      if (base64Str) {
        if (!base64Str.startsWith('data:')) {
          base64Str = 'data:image/jpeg;base64,' + base64Str;
        }
        
        try {
          const dir = FileSystem.documentDirectory + 'ARDMS_Media/';
          const dirInfo = await FileSystem.getInfoAsync(dir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
          }
          const filename = `rescuer_photo_${Date.now()}.jpg`;
          const fileUri = dir + filename;
          const base64Code = base64Str.split('base64,')[1] || base64Str;
          await FileSystem.writeAsStringAsync(fileUri, base64Code, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } catch (e) {
          console.error('[Media Save Error]', e);
        }
        
        const code = `if (window.onImageCaptured) { window.onImageCaptured('${base64Str}', '${taskId}'); } true;`;
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(code);
        }
      }
    } catch (err) {
      console.error('[Image Process Error]', err);
      Alert.alert('Error', 'Failed to process photo.');
    }
  };


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
                Alert.alert(
                  'Attach Photo',
                  'Choose photo source',
                  [
                    {
                      text: 'Camera',
                      onPress: async () => {
                        if (!cameraPermission?.granted) {
                          const p = await requestCameraPermission();
                          if (!p.granted) {
                            Alert.alert('Permission Denied', 'Camera permission is required.');
                            return;
                          }
                        }
                        setActiveTaskId(data.taskId);
                        setIsCameraActive(true);
                      }
                    },
                    {
                      text: 'Gallery',
                      onPress: async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                          Alert.alert('Permission Denied', 'Gallery permission is required.');
                          return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ['images'],
                          allowsEditing: false,
                        });
                        processImageResult(result, data.taskId);
                      }
                    },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
                
                async function processImageResult(result, taskId) {
                  if (result.canceled || !result.assets || result.assets.length === 0) return;
                  const asset = result.assets[0];
                  await processImageUri(asset.uri, taskId);
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
      {/* Custom Camera Overlay */}
      {isCameraActive && !capturedPhoto && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView 
            style={StyleSheet.absoluteFill} 
            facing="back"
            ref={cameraRef}
          >
            <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', paddingBottom: 40, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-around', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setIsCameraActive(false)} style={{ padding: 15 }}>
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={async () => {
                    if (cameraRef.current) {
                      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
                      setCapturedPhoto(photo);
                    }
                  }} 
                  style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', borderWidth: 4, borderColor: '#ccc' }} 
                />
                <View style={{ width: 60 }} />
              </View>
            </View>
          </CameraView>
        </View>
      )}

      {/* Captured Photo Preview */}
      {isCameraActive && capturedPhoto && (
        <View style={StyleSheet.absoluteFill}>
          <Image source={{ uri: capturedPhoto.uri }} style={StyleSheet.absoluteFill} />
          <View style={{ position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'space-around' }}>
            <TouchableOpacity 
              onPress={() => setCapturedPhoto(null)} 
              style={{ padding: 15, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10 }}
            >
              <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={async () => {
                const uri = capturedPhoto.uri;
                const tid = activeTaskId;
                setIsCameraActive(false);
                setCapturedPhoto(null);
                setActiveTaskId(null);
                await processImageUri(uri, tid);
              }} 
              style={{ padding: 15, backgroundColor: '#2563eb', borderRadius: 10 }}
            >
              <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
