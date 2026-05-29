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
const SERVER_IP = '192.168.1.4';
const SERVER_PORT = '3001';
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [serverIp, setServerIp] = useState(SERVER_IP);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [tempIp, setTempIp] = useState(SERVER_IP);
  const webViewRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('serverIp').then(val => {
      if (val) {
        setServerIp(val);
        setTempIp(val);
      }
    });
    AsyncStorage.getItem('rescuer_token').then(val => {
      if (val) setToken(val);
    });
    AsyncStorage.getItem('rescue_user_v3').then(val => {
      if (val) setUser(JSON.parse(val));
    });
  }, []);

  const saveIp = async () => {
    const cleanIp = tempIp.trim();
    if (!cleanIp) {
      Alert.alert("Error", "Please enter a valid IP address");
      return;
    }
    await AsyncStorage.setItem('serverIp', cleanIp);
    setServerIp(cleanIp);
    setShowConfig(false);
    Alert.alert("Server IP Updated", `Reconnecting to http://${cleanIp}:${SERVER_PORT}`);
  };

  const handleLogin = async (phone, pin, ip) => {
    try {
      const cleanIp = ip.trim();
      await AsyncStorage.setItem('serverIp', cleanIp);
      setServerIp(cleanIp);
      setTempIp(cleanIp);
      
      let localDeviceId = await AsyncStorage.getItem('rescuer_device_id');
      if (!localDeviceId) {
        localDeviceId = 'RESDEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        await AsyncStorage.setItem('rescuer_device_id', localDeviceId);
      }

      const res = await fetch(`http://${cleanIp}:${SERVER_PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idOrPhone: phone.trim(), pin, deviceId: localDeviceId })
      });

      if (res.ok) {
        const data = await res.json();
        await AsyncStorage.setItem('rescuer_token', data.token);
        await AsyncStorage.setItem('rescue_user_v3', JSON.stringify(data.user));
        setUser(data.user);
        setToken(data.token);
      } else {
        const errData = await res.json();
        Alert.alert("Login Failed", errData.error || "Access Denied");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Network Error", "Could not connect to the server. Please check the IP address and Wi-Fi connection.");
    }
  };

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
    localStorage.setItem('rescuer_token', '${token || ''}');
    localStorage.setItem('rescue_user_v3', '${user ? JSON.stringify(user).replace(/'/g, "\\'") : ''}');
    localStorage.setItem('app_installed_launch', 'true');
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

  if (!token || !user) {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        initialIp={serverIp} 
      />
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

            if (data.type === 'LOGOUT') {
              await AsyncStorage.removeItem('rescuer_token');
              await AsyncStorage.removeItem('rescue_user_v3');
              setUser(null);
              setToken(null);
              return;
            }

            if (data.type === 'UPDATE_IP') {
              await AsyncStorage.setItem('serverIp', data.ip);
              setServerIp(data.ip);
              setTempIp(data.ip);
              Alert.alert("Server IP Updated", "Reconnecting to the new IP address...");
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

      {/* Floating settings gear button */}
      <TouchableOpacity 
        style={styles.floatingSettingsBtn} 
        onPress={() => setShowConfig(true)}
      >
        <Text style={{ fontSize: 24 }}>⚙️</Text>
      </TouchableOpacity>

      {/* Settings Modal */}
      <Modal visible={showConfig} transparent={true} animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Server Configuration</Text>
            <Text style={styles.modalLabel}>Enter Laptop IP Address:</Text>
            <TextInput
              style={styles.modalInput}
              value={tempIp}
              onChangeText={setTempIp}
              placeholder="e.g. 192.168.1.15"
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#f1f5f9' }]} onPress={() => setShowConfig(false)}>
                <Text style={{ color: '#0f172a', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#0ea5e9' }]} onPress={saveIp}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Save IP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingSettingsBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 999,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  modalBtn: {
    flex: 0.48,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  }
});

function LoginScreen({ onLogin, initialIp }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [ip, setIp] = useState(initialIp);

  useEffect(() => {
    setIp(initialIp);
  }, [initialIp]);

  useEffect(() => {
    AsyncStorage.getItem('serverIp').then(val => {
      if (val) {
        setIp(val);
      }
    });
  }, []);

  return (
    <View style={loginStyles.container}>
      <View style={loginStyles.card}>
        <View style={loginStyles.logoCircle}>
          <Text style={{ fontSize: 44 }}>👨‍✈️</Text>
        </View>
        <Text style={loginStyles.title}>ARDMS Rescuer App</Text>
        <Text style={loginStyles.subtitle}>Official Officer Login</Text>

        <Text style={loginStyles.label}>OFFICER ID or PHONE</Text>
        <TextInput
          style={loginStyles.input}
          placeholder="MEM-01 or phone number"
          placeholderTextColor="#64748b"
          value={phone}
          onChangeText={setPhone}
        />

        <Text style={loginStyles.label}>SECURITY PIN</Text>
        <TextInput
          style={loginStyles.input}
          placeholder="Enter 6-digit PIN"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={pin}
          onChangeText={setPin}
          keyboardType="numeric"
        />

        <Text style={loginStyles.label}>SERVER IP ADDRESS</Text>
        <TextInput
          style={loginStyles.input}
          placeholder="e.g. 192.168.1.15"
          placeholderTextColor="#64748b"
          value={ip}
          onChangeText={setIp}
        />

        <TouchableOpacity 
          style={loginStyles.button} 
          onPress={() => onLogin(phone, pin, ip)}
        >
          <Text style={loginStyles.buttonText}>Secure Login System</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: 'bold',
    marginBottom: 24,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 6,
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
    fontSize: 15,
    marginBottom: 16,
  },
  button: {
    width: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
