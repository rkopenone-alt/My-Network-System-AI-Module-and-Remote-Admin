import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, PermissionsAndroid, Platform, Alert, Image, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { htmlString } from './htmlStr';

// ─── Server Configuration ─────────────────────────────────────────────────────
// Update SERVER_IP to your machine's Wi-Fi IP address.
const SERVER_IP = '';
const SERVER_PORT = '3001';
// ─────────────────────────────────────────────────────────────────────────────

const GlobalState = {
  setIsConnected: null,
  lastSuccessTime: 0,
};

// Helper: fetch with timeout to prevent hanging connections
const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    if (response && (response.ok || response.status < 500)) {
      if (GlobalState.setIsConnected) {
        GlobalState.setIsConnected(true);
      }
      GlobalState.lastSuccessTime = Date.now();
    }
    return response;
  } catch (error) {
    clearTimeout(id);
    if (GlobalState.setIsConnected) {
      GlobalState.setIsConnected(false);
    }
    throw error;
  }
};

function NetworkStatusIndicator({ isConnected }) {
  return (
    <View style={indicatorStyles.container}>
      <View style={[indicatorStyles.dot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
      <Text style={indicatorStyles.text}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
    </View>
  );
}

const indicatorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 35,
    right: 15,
    zIndex: 99999,
    elevation: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
  }
});

export default function App() {
  const [appState, setAppState] = useState('NETWORK_SETUP');
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [ipInput, setIpInput] = useState(SERVER_IP);
  const [hasPermission, setHasPermission] = useState(null);
  const [serverIp, setServerIp] = useState(SERVER_IP);
  const [isConnected, setIsConnected] = useState(false);
  const webViewRef = useRef(null);

  useEffect(() => {
    GlobalState.setIsConnected = setIsConnected;
    return () => {
      GlobalState.setIsConnected = null;
    };
  }, []);

  // Periodic health check
  useEffect(() => {
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const cleanIp = serverIp ? serverIp.trim() : '';
    if (!cleanIp || !ipRegex.test(cleanIp)) {
      setIsConnected(false);
      return;
    }
    const checkConnection = async () => {
      if (Date.now() - (GlobalState.lastSuccessTime || 0) < 10000) {
        setIsConnected(true);
        return;
      }
      try {
        const res = await fetchWithTimeout(`http://${cleanIp}:${SERVER_PORT}/api/health`, {}, 3000);
        if (res.ok) {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (e) {
        setIsConnected(false);
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [serverIp]);

  const [clearSession, setClearSession] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      const APP_VERSION = '1.1.0';
      const storedVersion = await AsyncStorage.getItem('appVersion');
      if (storedVersion !== APP_VERSION) {
        setClearSession(true);
        await AsyncStorage.setItem('appVersion', APP_VERSION);
      }
      
      const ip = await AsyncStorage.getItem('serverIp');
      if (ip) {
        setServerIp(ip);
        setIpInput(ip);
      } else {
        await AsyncStorage.setItem('serverIp', SERVER_IP);
        setServerIp(SERVER_IP);
        setIpInput(SERVER_IP);
      }
      
      const session = await AsyncStorage.getItem('adminSession');
      if (session === 'active') {
        setAppState('DASHBOARD');
      }
    };
    initializeApp();
  }, []);

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
          const initialLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
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
            accuracy: Location.Accuracy.BestForNavigation,
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

  // Inject variables into the WebView
  // Keep this static so the WebView does not reload when state changes
  const injectedJavaScript = `
    window.__SERVER_PORT__ = '${SERVER_PORT}';
    window.__IS_NATIVE_APP__ = true;
    localStorage.setItem('app_installed_launch', 'true');
    localStorage.setItem('manualServerIp', '${serverIp}');
    true;
  `;

  if (hasPermission === null && appState === 'DASHBOARD') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Initializing Admin Dashboard...</Text>
      </View>
    );
  }

  if (appState === 'NETWORK_SETUP') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20 }}>
        <View style={{ backgroundColor: '#ffffff', padding: 30, borderRadius: 15, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
          <Image source={require('./assets/official_rescuer_icon.png')} style={{ width: 80, height: 80, alignSelf: 'center', marginBottom: 15 }} resizeMode="contain" />
          <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>Network Configuration</Text>
          <Text style={{ color: '#64748b', marginBottom: 10 }}>Enter Backend Server IP:</Text>
          <TextInput 
            style={{ backgroundColor: '#f1f5f9', color: '#0f172a', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#cbd5e1' }}
            value={ipInput}
            onChangeText={setIpInput}
            placeholder="e.g. 192.168.1.100"
            placeholderTextColor="#94a3b8"
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity 
            style={{ backgroundColor: '#0ea5e9', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 }}
            onPress={async () => {
              const clean = ipInput.trim();
              if(clean) {
                await AsyncStorage.setItem('serverIp', clean);
                setServerIp(clean);
                setAppState('LOGIN');
              }
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Save & Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ backgroundColor: '#1e40af', padding: 15, borderRadius: 10, alignItems: 'center' }}
            onPress={async () => {
              const localEmu = '10.0.2.2';
              await AsyncStorage.setItem('serverIp', localEmu);
              setServerIp(localEmu);
              setAppState('LOGIN');
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Local Emulator (10.0.2.2)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (appState === 'LOGIN') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20 }}>
        <View style={{ backgroundColor: '#ffffff', padding: 30, borderRadius: 15, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
          <Image source={require('./assets/official_rescuer_icon.png')} style={{ width: 80, height: 80, alignSelf: 'center', marginBottom: 15 }} resizeMode="contain" />
          <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' }}>Admin Login</Text>
          <Text style={{ color: '#64748b', fontSize: 14, marginBottom: 25, textAlign: 'center' }}>AntiGravity Tactical Command</Text>
          
          <TextInput 
            style={{ backgroundColor: '#f1f5f9', color: '#0f172a', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#cbd5e1' }}
            value={adminId}
            onChangeText={setAdminId}
            placeholder="Admin ID"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
          <TextInput 
            style={{ backgroundColor: '#f1f5f9', color: '#0f172a', padding: 15, borderRadius: 10, marginBottom: 25, borderWidth: 1, borderColor: '#cbd5e1' }}
            value={adminPassword}
            onChangeText={setAdminPassword}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />
          
          <TouchableOpacity 
            style={{ backgroundColor: '#22c55e', padding: 15, borderRadius: 10, alignItems: 'center' }}
            onPress={async () => {
              if (adminId === 'admin' && adminPassword === '123456') {
                await AsyncStorage.setItem('adminSession', 'active');
                setAppState('DASHBOARD');
              } else {
                Alert.alert('Access Denied', 'Invalid Admin ID or Password.');
              }
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Authenticate</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setAppState('NETWORK_SETUP')} style={{ marginTop: 20 }}>
            <Text style={{ color: '#0ea5e9', textAlign: 'center' }}>&larr; Back to Network Config</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {!isCameraActive && <NetworkStatusIndicator isConnected={isConnected} />}
      <WebView
        mediaPlaybackRequiresUserAction={false}
        ref={webViewRef}
        source={{ html: htmlString, baseUrl: `http://${serverIp}:${SERVER_PORT}` }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        allowFileAccess={true}
        scalesPageToFit={true}
        setBuiltInZoomControls={true}
        setDisplayZoomControls={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
        onMessage={async (event) => {
          // Handle messages from WebView back to native if needed
          try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('[WebView Message]', data);

            if (data.type === 'LOGOUT') {
              try {
                const keys = await AsyncStorage.getAllKeys();
                await AsyncStorage.multiRemove(keys.filter(k => k !== 'serverIp' && k !== 'rescuer_device_id'));
              } catch(e) {}
              return;
            }

            if (data.type === 'WS_STATUS') {
              setIsConnected(data.connected);
              if (data.connected) {
                GlobalState.lastSuccessTime = Date.now();
              }
              return;
            }

            if (data.type === 'UPDATE_IP') {
              await AsyncStorage.setItem('serverIp', data.ip);
              setServerIp(data.ip);
              return;
            }

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
