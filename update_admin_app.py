import os

filepath = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\App.js"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add states
state_target = "  const [hasPermission, setHasPermission] = useState(null);\n  const [serverIp, setServerIp] = useState(SERVER_IP);"
state_replace = """  const [appState, setAppState] = useState('NETWORK_SETUP');
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [ipInput, setIpInput] = useState(SERVER_IP);
  const [hasPermission, setHasPermission] = useState(null);
  const [serverIp, setServerIp] = useState(SERVER_IP);"""

if state_target in content:
    content = content.replace(state_target, state_replace)

# Modify initialization
init_target = """      const ip = await AsyncStorage.getItem('serverIp');
      if (ip) {
        setServerIp(ip);
      } else {
        await AsyncStorage.setItem('serverIp', SERVER_IP);
        setServerIp(SERVER_IP);
      }
    };
    initializeApp();"""
init_replace = """      const ip = await AsyncStorage.getItem('serverIp');
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
    initializeApp();"""

if init_target in content:
    content = content.replace(init_target, init_replace)

# Replace the render block
render_target = """  if (hasPermission === null) {
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

  return ("""

render_replace = """  if (hasPermission === null && appState === 'DASHBOARD') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Initializing Admin Dashboard...</Text>
      </View>
    );
  }

  if (appState === 'NETWORK_SETUP') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 20 }}>
        <View style={{ backgroundColor: '#1e293b', padding: 30, borderRadius: 15, width: '100%', maxWidth: 400 }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>Network Configuration</Text>
          <Text style={{ color: '#94a3b8', marginBottom: 10 }}>Enter Backend Server IP:</Text>
          <TextInput 
            style={{ backgroundColor: '#0f172a', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#334155' }}
            value={ipInput}
            onChangeText={setIpInput}
            placeholder="e.g. 192.168.1.100"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
          />
          <TouchableOpacity 
            style={{ backgroundColor: '#0ea5e9', padding: 15, borderRadius: 10, alignItems: 'center' }}
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
        </View>
      </View>
    );
  }

  if (appState === 'LOGIN') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 20 }}>
        <View style={{ backgroundColor: '#1e293b', padding: 30, borderRadius: 15, width: '100%', maxWidth: 400 }}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' }}>Admin Login</Text>
          <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 25, textAlign: 'center' }}>AntiGravity Tactical Command</Text>
          
          <TextInput 
            style={{ backgroundColor: '#0f172a', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#334155' }}
            value={adminId}
            onChangeText={setAdminId}
            placeholder="Admin ID"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
          />
          <TextInput 
            style={{ backgroundColor: '#0f172a', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 25, borderWidth: 1, borderColor: '#334155' }}
            value={adminPassword}
            onChangeText={setAdminPassword}
            placeholder="Password"
            placeholderTextColor="#64748b"
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

  return ("""

if render_target in content:
    content = content.replace(render_target, render_replace)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated admin-app/App.js successfully.")
