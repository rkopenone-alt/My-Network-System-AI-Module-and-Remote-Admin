import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator,
  Animated, Dimensions, Vibration, Alert
} from 'react-native';
// Simple persistent storage shim
const Store = {
  _data: {},
  async setItem(key, val) { this._data[key] = val; },
  async getItem(key) { return this._data[key] || null; },
  async removeItem(key) { delete this._data[key]; },
};
const AsyncStorage = Store;

const API_URL = 'http://192.168.1.100:3001/api'; // UPDATE THIS with your server IP
const { width } = Dimensions.get('window');

const C = {
  primary: '#0284c7',
  primaryLight: '#e0f2fe',
  secondary: '#10b981',
  danger: '#ef4444',
  dark: '#0f172a',
  light: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
};

// ─── Screen 1: Login ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const handleLogin = async () => {
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter your mobile number or name');
      return;
    }
    await AsyncStorage.setItem('sosUser', JSON.stringify({ phone: phone.trim(), name: phone.trim() }));
    onLogin({ phone: phone.trim(), name: phone.trim() });
  };

  return (
    <SafeAreaView style={s.loginBg}>
      <StatusBar barStyle="dark-content" backgroundColor={C.primaryLight} />
      <Animated.View style={[s.loginCard, { opacity: fadeIn, transform: [{ translateY: fadeIn.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
        <View style={s.logoCircle}>
          <Text style={{ fontSize: 44 }}>🆘</Text>
        </View>
        <Text style={s.loginTitle}>Citizen Rescue App</Text>
        <Text style={s.loginSub}>Secure Portal</Text>

        <Text style={s.label}>MOBILE NUMBER</Text>
        <TextInput
          style={s.input}
          placeholder="Enter your mobile number"
          placeholderTextColor={C.light}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <Text style={s.label}>PASSWORD</Text>
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={C.light}
          secureTextEntry
          value={pass}
          onChangeText={setPass}
        />
        <TouchableOpacity style={s.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
          <Text style={s.loginBtnText}>Secure Login System</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Screen 2: Requirements ───────────────────────────────────────────────────
function RequirementsScreen({ user, onNext, onBack }) {
  const [transportMode, setTransportMode] = useState('AIR');
  const [needs, setNeeds] = useState([6, 2, 1, 2]);
  const [peopleCount, setPeopleCount] = useState('5');
  const [attachments, setAttachments] = useState({ voice: false, camera: false, note: false });

  const updateNeed = (idx, delta) => {
    setNeeds(prev => {
      const n = [...prev];
      n[idx] = Math.max(0, n[idx] + delta);
      return n;
    });
  };

  const toggleAttachment = (type) => {
    setAttachments(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const transports = [
    { key: 'AIR', icon: '🚁', label: 'Air Support' },
    { key: 'Boat', icon: '🚤', label: 'Naval/Boat' },
    { key: 'Road', icon: '🚑', label: 'Road Transport' },
  ];

  const needLabels = ['Food Rations', 'Medical Tablets', 'Asthma Kit', 'Sanitary Kit'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={{ fontSize: 22 }}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Emergency Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Transport Mode */}
        <Text style={s.sectionLabel}>RESCUE MODE</Text>
        <View style={s.modeRow}>
          {transports.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.modeBtn, transportMode === t.key && s.modeBtnActive]}
              onPress={() => setTransportMode(t.key)}
            >
              <Text style={{ fontSize: 22, marginBottom: 4 }}>{t.icon}</Text>
              <Text style={[s.modeBtnLabel, transportMode === t.key && { color: C.white }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Media Attachments */}
        <Text style={[s.sectionLabel, { marginTop: 20 }]}>ATTACH INCIDENT MEDIA</Text>
        <View style={s.attachRow}>
          {[['voice', '🎤'], ['camera', '📷'], ['note', '📝']].map(([type, icon]) => (
            <TouchableOpacity
              key={type}
              style={[s.attachBtn, attachments[type] && s.attachBtnActive]}
              onPress={() => toggleAttachment(type)}
            >
              <Text style={{ fontSize: 26 }}>{icon}</Text>
              {attachments[type] && <View style={s.attachDot} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Supply Config */}
        <View style={s.needsBox}>
          <View style={s.needsTitleWrapper}>
            <Text style={s.needsTitle}>Supply Configuration</Text>
          </View>
          {needLabels.map((label, i) => (
            <View key={i} style={s.needRow}>
              <Text style={s.needLabel}>{label}</Text>
              <View style={s.counter}>
                <TouchableOpacity onPress={() => updateNeed(i, -1)}>
                  <Text style={s.counterBtn}>−</Text>
                </TouchableOpacity>
                <Text style={s.counterVal}>{needs[i]}</Text>
                <TouchableOpacity onPress={() => updateNeed(i, 1)}>
                  <Text style={s.counterBtn}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* People Count */}
        <View style={s.peopleBox}>
          <Text style={s.peopleLabel}>Total Affected Civilians:</Text>
          <View style={s.peopleInput}>
            <TextInput
              style={s.peopleNum}
              value={peopleCount}
              onChangeText={setPeopleCount}
              keyboardType="numeric"
            />
            <Text style={s.peopleSubLabel}>Heads</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.nextBtn}
          onPress={() => onNext({ transportMode, needs, peopleCount, attachments })}
        >
          <Text style={s.nextBtnText}>Confirm Details →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Screen 3: SOS Trigger ────────────────────────────────────────────────────
function SOSTriggerScreen({ user, details, onBack }) {
  const [emergencyType, setEmergencyType] = useState(null);
  const [isSosLocked, setIsSosLocked] = useState(false);
  const [countdown, setCountdown] = useState(15 * 60);
  const [missionStatus, setMissionStatus] = useState(null);
  const [toast, setToast] = useState(null);
  const sosScale = useRef(new Animated.Value(1)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { setIsSosLocked(false); return 15 * 60; }
        return prev - 1;
      });
    }, 1000);
    const syncInterval = setInterval(doSync, 10000);
    return () => { clearInterval(timer); clearInterval(syncInterval); };
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const showToast = (msg, icon = '⏳', duration = 3000) => {
    setToast({ msg, icon });
    Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true }).start();
    if (duration) {
      setTimeout(() => {
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
      }, duration);
    }
  };

  const doSync = async () => {
    try {
      const res = await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, deviceId: user.phone }),
      });
      const data = await res.json();
      if (data.notifications?.length > 0) showToast(data.notifications[0].message, '🔔', 5000);
      if (data.my_requests?.length > 0) updateMissionStatus(data.my_requests[0].status, data.my_requests[0]);
    } catch { }
  };

  const updateMissionStatus = (status, req) => {
    const labels = {
      pending: 'Request Received — Awaiting Dispatch',
      accepted: 'Team Dispatched — Help is Coming!',
      in_progress: 'Rescue Team En Route',
      completed: 'Mission Complete — You Are Safe!',
      declined: 'Request Declined — Please Retry',
    };
    const icons = { pending: '⏳', accepted: '🚁', in_progress: '🚑', completed: '✅', declined: '❌' };
    const colors = { pending: C.warning, accepted: C.primary, in_progress: '#8b5cf6', completed: C.secondary, declined: C.danger };
    setMissionStatus({ status, label: labels[status] || status, icon: icons[status] || '•', color: colors[status] || C.light });
    if (status === 'completed') showToast('✅ Mission Complete! You are safe.', '✅', 6000);
    if (status === 'accepted') showToast('🚁 Help is on the way!', '🚁', 5000);
  };

  const triggerSOS = async () => {
    if (isSosLocked) { showToast('Please wait for the current time slot to clear.', '⚠️'); return; }

    Vibration.vibrate([0, 200, 100, 200]);
    Animated.sequence([
      Animated.timing(sosScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.spring(sosScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    showToast('Connecting to server...', '⏳', 0);

    const reqType = emergencyType === 'Pregnancy Support' ? 'pregnancy' : emergencyType === 'Medical Support' ? 'medical' : null;
    const userDetails = {
      message: emergencyType || 'Manual SOS',
      transport: details.transportMode,
      needs: { food: details.needs[0], medical: details.needs[1], asthma: details.needs[2], sanitary: details.needs[3] },
      attachments: details.attachments,
      peopleCount: details.peopleCount,
    };

    try {
      if (reqType) {
        await fetch(`${API_URL}/rescue-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: user.phone, device_id: user.phone, type: reqType,
            lat: 13.085, lng: 80.272, details: JSON.stringify(userDetails),
            urgency: 'critical', sector: 'Current Location',
          }),
        });
      }
      await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: user.phone, deviceId: user.phone, action: 'sos_trigger',
          lat: 13.085, lng: 80.272, details: JSON.stringify(userDetails),
          sosAlert: { lat: 13.085, lng: 80.272, details: userDetails, isPriority: reqType ? 1 : 0 },
        }),
      });
      showToast('Your info is collected and help is being dispatched.', '✅', 4000);
      setIsSosLocked(true);
      setEmergencyType(null);
    } catch {
      showToast('Connection failed. Retrying...', '❌', 3000);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack}><Text style={{ fontSize: 22 }}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Emergency Trigger</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
        {/* Priority Buttons */}
        <Text style={s.sectionLabel}>PRIORITY MEDICAL BYPASS</Text>
        <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginBottom: 24 }}>
          {[['Pregnancy Support', '🤰', 'Pregnancy'], ['Medical Support', '💉', 'Critical Injury']].map(([type, icon, label]) => (
            <TouchableOpacity
              key={type}
              style={[s.medBtn, emergencyType === type && s.medBtnActive]}
              onPress={() => setEmergencyType(prev => prev === type ? null : type)}
            >
              <Text style={{ fontSize: 28 }}>{icon}</Text>
              <Text style={[s.medBtnLabel, emergencyType === type && { color: C.primary }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SOS Button */}
        <Text style={s.pressHold}>PRESS TO DISPATCH</Text>
        <Animated.View style={{ transform: [{ scale: sosScale }] }}>
          <TouchableOpacity style={s.sosBtn} onPress={triggerSOS} activeOpacity={0.85}>
            <Text style={s.sosBtnText}>SOS</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' }}>TAP TO ALERT</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Countdown */}
        <View style={s.timerBox}>
          <Text style={s.timerLabel}>Next Sync Slot: </Text>
          <Text style={s.timerVal}>{formatTime(countdown)}</Text>
        </View>

        {/* Mission Status */}
        {missionStatus && (
          <View style={[s.missionPanel, { borderColor: missionStatus.color, backgroundColor: missionStatus.color + '15' }]}>
            <Text style={[s.missionPanelLabel, { color: missionStatus.color }]}>MISSION STATUS</Text>
            <Text style={[s.missionPanelText, { color: missionStatus.color }]}>
              {missionStatus.icon} {missionStatus.label}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Toast */}
      {toast && (
        <Animated.View style={[s.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }]}>
          <Text style={{ fontSize: 18 }}>{toast.icon}</Text>
          <Text style={s.toastText}>{toast.msg}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('login'); // login | requirements | trigger
  const [details, setDetails] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('sosUser').then(saved => {
      if (saved) { setUser(JSON.parse(saved)); setScreen('requirements'); }
      setChecking(false);
    });
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('sosUser');
    setUser(null);
    setScreen('login');
  };

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.primaryLight }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (screen === 'login') {
    return <LoginScreen onLogin={(u) => { setUser(u); setScreen('requirements'); }} />;
  }
  if (screen === 'requirements') {
    return <RequirementsScreen user={user} onNext={(d) => { setDetails(d); setScreen('trigger'); }} onBack={handleLogout} />;
  }
  if (screen === 'trigger') {
    return <SOSTriggerScreen user={user} details={details} onBack={() => setScreen('requirements')} />;
  }
  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Login
  loginBg: { flex: 1, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loginCard: { width: '100%', backgroundColor: C.white, borderRadius: 24, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 8 },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.white, borderWidth: 3, borderColor: C.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  loginTitle: { fontSize: 26, fontWeight: '900', color: C.dark, marginBottom: 4 },
  loginSub: { fontSize: 14, fontWeight: '700', color: C.primary, marginBottom: 28 },
  label: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '700', color: C.light, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { width: '100%', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 16, fontWeight: '600', fontSize: 15, color: C.dark, backgroundColor: C.bg },
  loginBtn: { backgroundColor: C.secondary, paddingVertical: 15, borderRadius: 12, width: '100%', alignItems: 'center', shadowColor: C.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, marginTop: 8 },
  loginBtnText: { color: C.white, fontWeight: '800', fontSize: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.white },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.dark },

  // Requirements
  sectionLabel: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '700', color: C.light, letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
  modeRow: { flexDirection: 'row', gap: 8, width: '100%' },
  modeBtn: { flex: 1, borderWidth: 2, borderColor: C.border, borderRadius: 12, padding: 12, alignItems: 'center', backgroundColor: C.white },
  modeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  modeBtnLabel: { fontSize: 11, fontWeight: '700', color: C.dark, textAlign: 'center', marginTop: 2 },

  attachRow: { flexDirection: 'row', gap: 12, justifyContent: 'flex-start' },
  attachBtn: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, position: 'relative' },
  attachBtnActive: { borderColor: C.secondary },
  attachDot: { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: C.secondary, borderWidth: 2, borderColor: C.white },

  needsBox: { borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, paddingTop: 22, marginTop: 20, position: 'relative' },
  needsTitleWrapper: { position: 'absolute', top: -12, left: 20, right: 20, alignItems: 'center', zIndex: 1 },
  needsTitle: { backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 20, fontWeight: '700', fontSize: 12, color: C.dark, borderWidth: 1, borderColor: C.border },
  needRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  needLabel: { fontWeight: '600', color: C.dark, fontSize: 14 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
  counterBtn: { color: C.primary, fontSize: 20, fontWeight: '900', paddingHorizontal: 4 },
  counterVal: { color: C.dark, fontWeight: '700', fontSize: 15, minWidth: 30, textAlign: 'center' },

  peopleBox: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 16, backgroundColor: C.bg, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  peopleLabel: { color: C.dark, fontSize: 14, fontWeight: '700', flex: 1 },
  peopleInput: { width: 70, height: 70, backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  peopleNum: { color: C.primary, fontSize: 26, fontWeight: '900', textAlign: 'center', width: '100%', padding: 0 },
  peopleSubLabel: { fontSize: 10, fontWeight: '700', color: C.light, textTransform: 'uppercase' },

  nextBtn: { backgroundColor: C.dark, padding: 15, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  nextBtnText: { color: C.white, fontWeight: '800', fontSize: 15 },

  // SOS Trigger
  pressHold: { fontSize: 13, fontWeight: '700', color: C.light, letterSpacing: 1.5, marginBottom: 20 },
  sosBtn: { width: 160, height: 160, borderRadius: 80, backgroundColor: C.danger, justifyContent: 'center', alignItems: 'center', borderWidth: 6, borderColor: '#fca5a5', shadowColor: C.danger, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12, marginBottom: 24 },
  sosBtnText: { color: C.white, fontSize: 44, fontWeight: '900', letterSpacing: 2 },

  timerBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  timerLabel: { fontWeight: '600', fontSize: 13, color: C.light, textTransform: 'uppercase' },
  timerVal: { color: C.danger, fontSize: 22, fontWeight: '900' },

  medBtn: { flex: 1, backgroundColor: C.white, borderWidth: 2, borderColor: '#fca5a5', borderRadius: 12, padding: 16, alignItems: 'center', gap: 6 },
  medBtnActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  medBtnLabel: { fontSize: 13, fontWeight: '700', color: C.danger, textAlign: 'center' },

  missionPanel: { marginTop: 20, padding: 14, borderRadius: 12, borderWidth: 1, width: '100%', alignItems: 'center' },
  missionPanelLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  missionPanelText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },

  toast: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: C.dark, borderRadius: 30, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10 },
  toastText: { color: C.white, fontWeight: '600', fontSize: 13, flex: 1 },
});
