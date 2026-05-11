import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, FeatureGroup, Rectangle, useMapEvents, useMap } from 'react-leaflet';
import {
  ShieldAlert, Activity, Users, Settings, Send, Menu, Plus, Trash2, Edit2,
  Download, Map, Wifi, MessageSquare, Radio, Clock, History, FileText,
  ChevronRight, X, Check, AlertTriangle, Globe, Database, Bell, LogOut
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './index.css';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});
const rescueIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const sosIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const priorityIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [30, 48], iconAnchor: [15, 48], popupAnchor: [1, -40], shadowSize: [41, 41] });

const API = 'http://localhost:3001/api';

// ── Rectangle Draw Handler ───────────────────────────────────────────
function RectangleDrawHandler({ isDrawing, onComplete }) {
  const [startPt, setStartPt] = useState(null);
  const [currentPt, setCurrentPt] = useState(null);
  const map = useMap();

  useMapEvents({
    click(e) {
      if (!isDrawing) return;
      if (!startPt) {
        setStartPt(e.latlng);
        map.getContainer().style.cursor = 'crosshair';
      } else {
        onComplete([startPt, e.latlng]);
        setStartPt(null);
        setCurrentPt(null);
        map.getContainer().style.cursor = '';
      }
    },
    mousemove(e) {
      if (isDrawing && startPt) setCurrentPt(e.latlng);
    }
  });

  if (!isDrawing) return null;
  if (startPt && currentPt) {
    return <Rectangle bounds={[[startPt.lat, startPt.lng], [currentPt.lat, currentPt.lng]]} color="#f59e0b" dashArray="8,4" weight={2} fillOpacity={0.15} />;
  }
  return null;
}

// ── Radius Draw Handler ───────────────────────────────────────────
function RadiusDrawHandler({ isDrawing, onComplete }) {
  const [centerPt, setCenterPt] = useState(null);
  const [currentPt, setCurrentPt] = useState(null);
  const map = useMap();

  useMapEvents({
    click(e) {
      if (!isDrawing) return;
      if (!centerPt) {
        setCenterPt(e.latlng);
        map.getContainer().style.cursor = 'crosshair';
      } else {
        const radius = centerPt.distanceTo(e.latlng);
        onComplete({ center: centerPt, radius });
        setCenterPt(null);
        setCurrentPt(null);
        map.getContainer().style.cursor = '';
      }
    },
    mousemove(e) {
      if (isDrawing && centerPt) setCurrentPt(e.latlng);
    }
  });

  if (!isDrawing) return null;
  if (centerPt && currentPt) {
    const radius = centerPt.distanceTo(currentPt);
    return <Circle center={centerPt} radius={radius} color="#f59e0b" dashArray="8,4" weight={2} fillOpacity={0.15} />;
  }
  return null;
}

// ── Modal ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal-content ${wide ? 'modal-wide' : ''}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Notification Toast ───────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  return (
    <div className={`toast toast-${type}`}>
      {type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
      <span>{msg}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  // Core data
  const [zones, setZones] = useState([]);
  const [rescuers, setRescuers] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [opTypes, setOpTypes] = useState([]);
  const [mapCache, setMapCache] = useState([]);
  const [cmdLog, setCmdLog] = useState([]);
  const [settings, setSettings] = useState({ sos_interval: '15', sos_interval_unit: 'minutes', sharing_protocol: 'auto' });
  const [wsStatus, setWsStatus] = useState('offline');
  const [toasts, setToasts] = useState([]);

  // UI panel state
  const [activePanel, setActivePanel] = useState(null); // 'settings' | 'menu' | 'log' | 'users' | 'groups' | 'optypes'
  const [menuTab, setMenuTab] = useState('rescuers'); // 'rescuers' | 'public' | 'groups' | 'optypes'
  const [settingsTab, setSettingsTab] = useState('maps'); // 'maps' | 'protocol' | 'sync'

  // Zone draw
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState('rectangle'); // 'rectangle' | 'radius'
  const [pendingZone, setPendingZone] = useState(null);
  const [pendingRadius, setPendingRadius] = useState(null);
  const [zoneName, setZoneName] = useState('');
  const [operationType, setOperationType] = useState('');
  const [assignedGroup, setAssignedGroup] = useState('');

  // Map cache form
  const [mapForm, setMapForm] = useState({ name: '', type: 'radius', radius_val: 10, radius_unit: 'km', state: '', district: '' });
  const [loadedMapId, setLoadedMapId] = useState(null);

  // Real-time GPS for Map Download Preview
  const [currentPos, setCurrentPos] = useState({ lat: 20.5937, lng: 78.9629 });

  // User form
  const [userForm, setUserForm] = useState({ name: '', role: 'rescuer', phone: '', device_id: '' });
  const [editUserModal, setEditUserModal] = useState(null);

  // Group form
  const [groupForm, setGroupForm] = useState({ group_name: '', role_type: 'rescue', description: '' });
  const [editGroupModal, setEditGroupModal] = useState(null);
  const [groupMembersModal, setGroupMembersModal] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);

  // OpType form
  const [opTypeForm, setOpTypeForm] = useState({ name: '', color: '#3b82f6', icon: '🛡️', description: '' });
  const [editOpTypeModal, setEditOpTypeModal] = useState(null);

  // Command & Dispatch
  const [liveCommands, setLiveCommands] = useState([]);
  const [cmdForm, setCmdForm] = useState({ type: 'normal', target: 'group', targetId: '', message: '' });
  const [reassignModal, setReassignModal] = useState(null);

  // Log filter
  const [logFilter, setLogFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');

  const toast = (msg, type = 'success') => setToasts(p => [...p, { id: Date.now(), msg, type }]);

  // ── WebSocket & Geolocation ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll();

    // Get live GPS for map ping
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setCurrentPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
        e => console.log('Location denied, using default')
      );
    }

    const ws = new WebSocket('ws://192.168.1.11:3001');
    ws.onopen = () => {
      setWsStatus('active');
      ws.send(JSON.stringify({ type: 'REGISTER', deviceId: 'REACT_ADMIN_' + Date.now(), room: 'admin' }));
    };
    ws.onclose = () => setWsStatus('offline');
    ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      if (type === 'NEW_ZONE') setZones(p => [...p, data]);
      if (type === 'SOS_ALERT') { setSosAlerts(p => [...p, data]); toast(`🚨 SOS from ${data.deviceId}`, 'danger'); }
      if (type === 'RESCUER_UPDATE') setRescuers(p => { const i = p.findIndex(r => r.device_id === data.deviceId); if (i >= 0) { const c = [...p]; c[i] = { ...c[i], ...data }; return c; } return [...p, data]; });
      if (type === 'SETTINGS_UPDATED') setSettings(p => ({ ...p, [data.key]: data.value }));
      if (type === 'NEW_COMMAND') {
          setLiveCommands(p => [data, ...p]);
      }
      if (type === 'COMMAND_STATUS_UPDATE' || type === 'COMMAND_REASSIGNED') {
          setLiveCommands(p => {
              const idx = p.findIndex(c => c.id === data.id);
              if (idx >= 0) { const next = [...p]; next[idx] = data; return next; }
              return [data, ...p];
          });
      }
      if (type === 'COMMAND_LOG') setCmdLog(p => [data, ...p].slice(0, 500));
      if (type === 'GROUP_UPDATE') setGroups(p => { const i = p.findIndex(g => g.id === data.id); if (i >= 0) { const c = [...p]; c[i] = data; return c; } return [...p, data]; });
      if (type === 'GROUP_DELETED') setGroups(p => p.filter(g => g.id !== data.id));
      if (type === 'MAP_DOWNLOADED') { setMapCache(p => [data, ...p]); toast(`🗺️ Map "${data.name}" downloaded`); }
    };
    return () => ws.close();
  }, []);

  const fetchAll = async () => {
    try {
      const [z, g, s, st, u, ot, mc, log, cmds] = await Promise.all([
        fetch(`${API}/zones`).then(r => r.json()),
        fetch(`${API}/groups`).then(r => r.json()),
        fetch(`${API}/sos`).then(r => r.json()),
        fetch(`${API}/settings`).then(r => r.json()),
        fetch(`${API}/users`).then(r => r.json()),
        fetch(`${API}/operation-types`).then(r => r.json()),
        fetch(`${API}/map-cache`).then(r => r.json()),
        fetch(`${API}/command-log`).then(r => r.json()),
        fetch(`${API}/commands`).then(r => r.json()),
      ]);
      setZones(z || []);
      setGroups(g || []);
      setSosAlerts(s || []);
      setSettings(p => ({ ...p, ...st }));
      setUsers(u || []);
      setOpTypes(ot || []);
      setMapCache(mc || []);
      setCmdLog(log || []);
      setLiveCommands(cmds || []);
      if (g && g.length > 0) { 
          setAssignedGroup(g[0].id.toString()); 
          setCmdForm(p => ({ ...p, targetId: g[0].id.toString() }));
      }
      if (ot && ot.length > 0) setOperationType(ot[0].name);
    } catch (e) { console.error('Fetch error', e); }
  };

  // ── Settings save ────────────────────────────────────────────────────────
  const saveSetting = async (key, value) => {
    await fetch(`${API}/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
    setSettings(p => ({ ...p, [key]: value }));
    toast('Setting saved');
  };

  // ── Zone draw complete ────────────────────────────────────────────────────
  const handleDrawComplete = useCallback((geoData) => {
    setIsDrawing(false);
    if (Array.isArray(geoData)) {
      setPendingZone(geoData);
      setPendingRadius(null);
    } else {
      setPendingZone(null);
      setPendingRadius(geoData);
    }
    setZoneName(`Zone-${Date.now().toString().slice(-4)}`);
  }, []);

  const confirmZone = async () => {
    if (!pendingZone && !pendingRadius) return;
    let geo;
    if (pendingZone) {
      const [p1, p2] = pendingZone;
      geo = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[p1.lng, p1.lat], [p2.lng, p1.lat], [p2.lng, p2.lat], [p1.lng, p2.lat], [p1.lng, p1.lat]]] }, properties: { bounds: [[p1.lat, p1.lng], [p2.lat, p2.lng]] } };
    } else if (pendingRadius) {
      geo = { type: 'Feature', geometry: { type: 'Point', coordinates: [pendingRadius.center.lng, pendingRadius.center.lat] }, properties: { radius: pendingRadius.radius } };
    }
    try {
      await fetch(`${API}/zones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zone_geometry: geo, operation_type: operationType, assigned_group_id: parseInt(assignedGroup), created_by: 'Commander', zone_name: zoneName }) });
      setPendingZone(null);
      setPendingRadius(null);
      toast(`Zone "${zoneName}" created`);
    } catch (e) { toast('Failed to create zone', 'danger'); }
  };

  // ── Map cache ─────────────────────────────────────────────────────────────
  const downloadMap = async () => {
    if (!mapForm.name) return toast('Enter a map name', 'danger');
    const pos = await new Promise((res) => {
      if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res({ lat: 20.5937, lng: 78.9629 }));
      else res({ lat: 20.5937, lng: 78.9629 });
    });
    const radKm = mapForm.radius_unit === 'km' ? Number(mapForm.radius_val) : Number(mapForm.radius_val) / 1000;
    await fetch(`${API}/map-cache`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...mapForm, radius_km: radKm, center_lat: pos.lat, center_lng: pos.lng }) });
    setMapForm({ name: '', type: 'radius', radius_val: 10, radius_unit: 'km', state: '', district: '' });
    fetchAll();
  };

  const deleteMap = async (id) => {
    if (!confirm('Delete this map cache?')) return;
    await fetch(`${API}/map-cache/${id}`, { method: 'DELETE' });
    setMapCache(p => p.filter(m => m.id !== id));
    toast('Map cache deleted');
  };

  // ── Users CRUD ────────────────────────────────────────────────────────────
  const addUser = async () => {
    if (!userForm.name) return toast('Name required', 'danger');
    await fetch(`${API}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) });
    setUserForm({ name: '', role: 'rescuer', phone: '', device_id: '' });
    fetchAll();
    toast('User added');
  };

  const saveEditUser = async () => {
    if (!editUserModal) return;
    await fetch(`${API}/users/${editUserModal.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editUserModal) });
    setEditUserModal(null);
    fetchAll();
    toast('User updated');
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    await fetch(`${API}/users/${id}`, { method: 'DELETE' });
    fetchAll();
    toast('User deleted');
  };

  // ── Groups CRUD ───────────────────────────────────────────────────────────
  const addGroup = async () => {
    if (!groupForm.group_name) return toast('Name required', 'danger');
    await fetch(`${API}/groups`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groupForm) });
    setGroupForm({ group_name: '', role_type: 'rescue', description: '' });
    fetchAll();
    toast('Group created');
  };

  const saveEditGroup = async () => {
    if (!editGroupModal) return;
    await fetch(`${API}/groups/${editGroupModal.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editGroupModal) });
    setEditGroupModal(null);
    fetchAll();
    toast('Group updated');
  };

  const deleteGroup = async (id) => {
    if (!confirm('Delete this group?')) return;
    await fetch(`${API}/groups/${id}`, { method: 'DELETE' });
    fetchAll();
    toast('Group deleted');
  };

  const openGroupMembers = async (group) => {
    setGroupMembersModal(group);
    const members = await fetch(`${API}/groups/${group.id}/members`).then(r => r.json());
    setGroupMembers(members || []);
  };

  const addMemberToGroup = async (userId) => {
    await fetch(`${API}/groups/${groupMembersModal.id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
    const members = await fetch(`${API}/groups/${groupMembersModal.id}/members`).then(r => r.json());
    setGroupMembers(members || []);
    fetchAll();
    toast('Member added to group');
  };

  const removeMemberFromGroup = async (userId) => {
    await fetch(`${API}/groups/${groupMembersModal.id}/members/${userId}`, { method: 'DELETE' });
    const members = await fetch(`${API}/groups/${groupMembersModal.id}/members`).then(r => r.json());
    setGroupMembers(members || []);
    fetchAll();
  };

  // ── OpTypes CRUD ──────────────────────────────────────────────────────────
  const addOpType = async () => {
    if (!opTypeForm.name) return toast('Name required', 'danger');
    await fetch(`${API}/operation-types`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opTypeForm) });
    setOpTypeForm({ name: '', color: '#3b82f6', icon: '🛡️', description: '' });
    fetchAll();
    toast('Operation type added');
  };

  const saveEditOpType = async () => {
    if (!editOpTypeModal) return;
    await fetch(`${API}/operation-types/${editOpTypeModal.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editOpTypeModal) });
    setEditOpTypeModal(null);
    fetchAll();
    toast('Operation type updated');
  };

  const deleteOpType = async (id) => {
    if (!confirm('Delete this operation type?')) return;
    await fetch(`${API}/operation-types/${id}`, { method: 'DELETE' });
    fetchAll();
    toast('Operation type deleted');
  };

  // ── Zone render ───────────────────────────────────────────────────────────
  const renderZone = (zone) => {
    const geo = typeof zone.zone_geometry === 'string' ? JSON.parse(zone.zone_geometry) : zone.zone_geometry;
    const ot = opTypes.find(o => o.name === zone.operation_type);
    const color = ot ? ot.color : '#3b82f6';
    if (!geo) return null;
    if (geo.geometry?.type === 'Polygon') {
      const bounds = geo.properties?.bounds;
      if (bounds) return <Rectangle key={zone.id} bounds={bounds} color={color} fillOpacity={0.15}><Popup><strong>{zone.zone_name}</strong><br />Type: {zone.operation_type}<br />Group: {zone.group_name || 'N/A'}</Popup></Rectangle>;
    }
    if (geo.geometry?.type === 'Point' && geo.properties?.radius) {
      const center = [geo.geometry.coordinates[1], geo.geometry.coordinates[0]];
      return <Circle key={zone.id} center={center} radius={geo.properties.radius} color={color} fillOpacity={0.2}><Popup>{zone.zone_name}: {zone.operation_type}</Popup></Circle>;
    }
    return null;
  };

  // ── Command Dispatch ──────────────────────────────────────────────────────
  const createCommand = async () => {
    if (!cmdForm.message.trim()) return toast('Enter a command message', 'danger');
    if (!cmdForm.targetId) return toast('Select a target', 'danger');
    const isGroup = cmdForm.target === 'group';
    const body = {
      command_type: cmdForm.type,
      command_payload: { message: cmdForm.message },
      actor: 'Commander',
      ...(isGroup ? { group_id: parseInt(cmdForm.targetId) } : { target_phone: cmdForm.targetId }),
    };
    await fetch(`${API}/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setCmdForm(p => ({ ...p, message: '' }));
    fetchAll();
    toast(cmdForm.type === 'critical' ? '🚨 Critical command dispatched!' : '📢 Command dispatched', cmdForm.type === 'critical' ? 'danger' : 'success');
  };

  const executeReassign = async () => {
    if (!reassignModal) return;
    const { id, newTarget, newTargetId } = reassignModal;
    if (!newTargetId) return toast('Select a target', 'danger');
    const isGroup = newTarget === 'group';
    await fetch(`${API}/commands/${id}/reassign`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isGroup ? { group_id: parseInt(newTargetId) } : { target_phone: newTargetId }),
    });
    setReassignModal(null);
    fetchAll();
    toast('Task reassigned successfully');
  };

  const getCommandLabel = (cmd) => {
    try {
      const p = typeof cmd.command_payload === 'string' ? JSON.parse(cmd.command_payload) : cmd.command_payload;
      return p?.message || cmd.command_type || 'Command';
    } catch { return cmd.command_type || 'Command'; }
  };

  // ── Log filter ────────────────────────────────────────────────────────────
  const filteredLog = cmdLog.filter(l => {
    const matchType = logFilter === 'all' || l.action.includes(logFilter.toUpperCase());
    const matchSearch = !logSearch || l.action.toLowerCase().includes(logSearch.toLowerCase()) || (l.target || '').toLowerCase().includes(logSearch.toLowerCase());
    return matchType && matchSearch;
  });

  const sosInterval = settings.sos_interval || '15';
  const sosUnit = settings.sos_interval_unit || 'minutes';
  const protocol = settings.sharing_protocol || 'auto';
  const prioritySOS = sosAlerts.filter(s => s.is_priority);

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="dashboard-container" style={{ position: 'relative' }}>

      {/* ── Toast Notifications ── */}
      <div className="toast-container">
        {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />)}
      </div>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <div className="sidebar">
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={28} color="#3b82f6" />
            <div>
              <h1 style={{ fontSize: '1.1rem', color: '#3b82f6' }}>Command Central</h1>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 2 }}>
                SOS Sync: <strong style={{ color: '#f59e0b' }}>{sosInterval} {sosUnit}</strong>
                &nbsp;|&nbsp;Protocol: <strong style={{ color: '#10b981' }}>{protocol.toUpperCase()}</strong>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button className={`header-btn ${activePanel === 'settings' ? 'active' : ''}`} title="Settings" onClick={() => setActivePanel(p => p === 'settings' ? null : 'settings')}>
              <Settings size={16} />
            </button>
            <button className={`header-btn ${activePanel === 'menu' ? 'active' : ''}`} title="Admin Menu" onClick={() => setActivePanel(p => p === 'menu' ? null : 'menu')}>
              <Menu size={16} />
            </button>
            <button className={`header-btn ${activePanel === 'log' ? 'active' : ''}`} title="Command Log" onClick={() => setActivePanel(p => p === 'log' ? null : 'log')}>
              <History size={16} />
            </button>
            <a href={`${API}/export/log`} className="header-btn" title="Export to CSV" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} />
            </a>
          </div>
        </div>

        <div className="sidebar-content">
          {/* System Status */}
          <div className="card">
            <h2><Activity size={16} /> System Status</h2>
            <div className="status-indicator"><span>NIB Sync (WS)</span><span><span className={`dot ${wsStatus}`}></span>{wsStatus.toUpperCase()}</span></div>
            <div className="status-indicator"><span>Active Zones</span><span>{zones.filter(z => z.status === 'active').length}</span></div>
            <div className="status-indicator"><span>Rescuers Online</span><span style={{ color: '#10b981' }}>{rescuers.length}</span></div>
            <div className="status-indicator"><span>Total SOS</span><span style={{ color: '#ef4444' }}>{sosAlerts.length}</span></div>

            <div style={{ marginTop: 15, padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: 6, fontSize: '0.8rem' }}>
              <div style={{ color: '#94a3b8', marginBottom: 4 }}>Last Command Action:</div>
              {cmdLog.length > 0 ? (
                <div>
                  <strong style={{ color: '#3b82f6' }}>{cmdLog[0].action}</strong>: {cmdLog[0].target}
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{new Date(cmdLog[0].timestamp).toLocaleTimeString()}</span>
                </div>
              ) : 'No recent actions'}
            </div>
          </div>

          {/* Zone Draw */}
          <div className="card">
            <h2><Map size={16} /> Zone Selection</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button className={`btn ${drawMode === 'rectangle' ? 'btn-primary' : ''}`} style={{ flex: 1, fontSize: '11px', padding: 6, background: drawMode === 'rectangle' ? '' : 'rgba(255,255,255,0.1)' }} onClick={() => setDrawMode('rectangle')}>Rectangle</button>
              <button className={`btn ${drawMode === 'radius' ? 'btn-primary' : ''}`} style={{ flex: 1, fontSize: '11px', padding: 6, background: drawMode === 'radius' ? '' : 'rgba(255,255,255,0.1)' }} onClick={() => setDrawMode('radius')}>Radius</button>
            </div>
            <button className={`btn ${isDrawing ? 'btn-warning' : 'btn-primary'}`} onClick={() => { setIsDrawing(!isDrawing); setPendingZone(null); setPendingRadius(null); }}>
              {isDrawing ? '✕ Cancel Drawing' : (drawMode === 'rectangle' ? '⬚ Draw Box' : '◎ Draw Radius')}
            </button>
            {isDrawing && <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: 6, textAlign: 'center' }}>{drawMode === 'rectangle' ? 'Click 1st corner → click 2nd corner' : 'Click center → click edge'}</div>}
          </div>

          {/* Priority SOS */}
          {prioritySOS.length > 0 && (
            <div className="card" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)' }}>
              <h2 style={{ color: '#ef4444' }}><Bell size={16} /> Priority Requests ({prioritySOS.length})</h2>
              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                {prioritySOS.map(s => {
                  const d = typeof s.details === 'string' ? JSON.parse(s.details) : s.details;
                  return (
                    <div key={s.id} style={{ borderBottom: '1px solid rgba(239,68,68,0.2)', padding: '6px 0' }}>
                      <div style={{ fontWeight: 700, fontSize: '12px', color: '#ef4444' }}>🚨 {d?.medicalNeed || 'Emergency'}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.device_id} • Adults: {d?.adults}</div>
                      <div style={{ fontSize: '11px', display: 'flex', gap: 6, justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>{d?.attachments?.voice && <span>🔊</span>}{d?.attachments?.camera && <span>📷</span>}{d?.attachments?.note && <span>📝</span>}</div>
                        <button onClick={() => setCmdForm({ type: 'critical', target: 'group', targetId: groups[0]?.id?.toString() || '', message: `🚨 SOS at ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}\nNeed: ${d?.medicalNeed || 'Emergency'}\nFrom: ${s.device_id || s.deviceId}` })} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '2px 8px', borderRadius: 4, fontSize: '10px', cursor: 'pointer', fontWeight: 700 }}>Assign Task</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Groups quick view */}
          <div className="card">
            <h2><Users size={16} /> Active Groups</h2>
            {groups.map(g => (
              <div key={g.id} className="status-indicator" style={{ borderBottom: '1px solid #1e293b', paddingBottom: 4 }}>
                <span>{g.icon || '🛟'} {g.group_name}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{g.member_count || g.actual_count || 0} members</span>
              </div>
            ))}
          </div>

          {/* Active Command Input */}
          <div className="card" style={{ border: cmdForm.type === 'critical' ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--border)', background: cmdForm.type === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(15,23,42,0.4)' }}>
            <h2 style={{ color: cmdForm.type === 'critical' ? '#ef4444' : 'var(--text-main)' }}>
              {cmdForm.type === 'critical' ? <span>🚨</span> : <Send size={16} />} Active Command Input
            </h2>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }}>Task Type</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[['normal', '📋 Normal', '#3b82f6'], ['critical', '🚨 Critical', '#ef4444']].map(([val, label, color]) => (
                <button key={val} onClick={() => setCmdForm(p => ({ ...p, type: val }))}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 6, border: `2px solid ${cmdForm.type === val ? color : 'var(--border)'}`, background: cmdForm.type === val ? `${color}22` : 'transparent', color: cmdForm.type === val ? color : 'var(--text-muted)', fontWeight: 700, fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif' }}>
                  {label}
                </button>
              ))}
            </div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }}>Assign To</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[['group', '👥 Group'], ['individual', '👤 Individual']].map(([val, label]) => (
                <button key={val} onClick={() => setCmdForm(p => ({ ...p, target: val, targetId: val === 'group' ? (groups[0]?.id?.toString() || '') : '' }))}
                  style={{ flex: 1, padding: '6px 4px', borderRadius: 6, border: `1px solid ${cmdForm.target === val ? '#3b82f6' : 'var(--border)'}`, background: cmdForm.target === val ? 'rgba(59,130,246,0.15)' : 'transparent', color: cmdForm.target === val ? '#3b82f6' : 'var(--text-muted)', fontWeight: 600, fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif' }}>
                  {label}
                </button>
              ))}
            </div>
            {cmdForm.target === 'group' ? (
              <select className="select-input" value={cmdForm.targetId} onChange={e => setCmdForm(p => ({ ...p, targetId: e.target.value }))}>
                <option value="">— Select Group —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.icon || '🛟'} {g.group_name}</option>)}
              </select>
            ) : (
              <select className="select-input" value={cmdForm.targetId} onChange={e => setCmdForm(p => ({ ...p, targetId: e.target.value }))}>
                <option value="">— Select Rescuer —</option>
                {users.filter(u => u.role === 'rescuer').map(u => <option key={u.id} value={u.phone}>{u.name} ({u.phone})</option>)}
              </select>
            )}
            <textarea className="text-input" rows={3} placeholder="Enter operational instructions..." value={cmdForm.message}
              onChange={e => setCmdForm(p => ({ ...p, message: e.target.value }))}
              style={{ resize: 'none', marginBottom: 10, border: cmdForm.type === 'critical' ? '1px solid rgba(239,68,68,0.4)' : '' }} />
            {cmdForm.type === 'critical' && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: '11px', color: '#fca5a5', lineHeight: 1.5 }}>
                ⚠️ <strong>HIGH PRIORITY:</strong> This will trigger an urgent popup on the rescuer's device requiring immediate Accept or Decline.
              </div>
            )}
            <button className={`btn ${cmdForm.type === 'critical' ? 'btn-danger' : 'btn-primary'}`} onClick={createCommand}
              style={{ fontWeight: 700, letterSpacing: '0.03em' }}>
              {cmdForm.type === 'critical' ? '🚨 Dispatch Critical Alert' : '📢 Dispatch Command'}
            </button>
          </div>

          {/* Live Commands */}
          <div className="card">
            <h2><Activity size={16} /> Live Commands
              <span style={{ marginLeft: 'auto', fontSize: '11px', background: 'rgba(59,130,246,0.2)', color: '#3b82f6', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                {liveCommands.filter(c => c.status === 'pending' || c.status === 'accepted').length} Active
              </span>
            </h2>
            <div style={{ maxHeight: 450, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, paddingRight: 4 }}>
              {liveCommands.filter(c => c.status !== 'completed').length === 0 && <div className="empty-state" style={{ fontSize: '12px', padding: '16px', gridColumn: '1 / -1' }}>No active commands</div>}
              {liveCommands.filter(c => c.status !== 'completed').slice(0, 20).map(cmd => {
                const isCritical = cmd.command_type === 'critical';
                const statusColors = { pending: '#f59e0b', accepted: '#10b981', declined: '#ef4444', completed: '#94a3b8', acknowledged: '#94a3b8' };
                const statusColor = statusColors[cmd.status] || '#94a3b8';
                return (
                  <div key={cmd.id} style={{ padding: '8px', borderRadius: 6, border: `1px solid ${isCritical ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`, background: isCritical ? 'rgba(239,68,68,0.06)' : 'rgba(15,23,42,0.5)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '11px', color: isCritical ? '#ef4444' : 'var(--text-main)' }}>
                        {isCritical ? '🚨 CRITICAL' : '📋 Normal'}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: statusColor, background: `${statusColor}22`, padding: '2px 6px', borderRadius: 4 }}>
                        {(cmd.status || 'pending').toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: 6, lineHeight: 1.4, flex: 1, wordBreak: 'break-word' }}>
                      {getCommandLabel(cmd)}
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748b', marginBottom: 6 }}>
                      → {cmd.target_phone ? `📱 ${cmd.target_phone}` : cmd.group_id ? `👥 Grp ${cmd.group_id}` : 'All'}
                      &nbsp;•&nbsp;{new Date(cmd.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {(cmd.status === 'pending' || cmd.status === 'declined') && (
                      <button onClick={() => setReassignModal({ id: cmd.id, label: getCommandLabel(cmd), newTarget: 'group', newTargetId: '' })}
                        style={{ width: '100%', padding: '4px', borderRadius: 4, border: '1px solid #334155', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontWeight: 600, fontSize: '10px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        🔄 Reassign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── MAP ──────────────────────────────────────────────────────────── */}
      <div className="map-container" style={{ cursor: isDrawing ? 'crosshair' : '' }}>
        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ width: '100%', height: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

          {/* Download Map Radius Preview Ping */}
          {activePanel === 'settings' && settingsTab === 'maps' && mapForm.type === 'radius' && (
            <FeatureGroup>
              <Marker position={[currentPos.lat, currentPos.lng]}>
                <Popup>Current GPS Location Ping</Popup>
              </Marker>
              <Circle
                center={[currentPos.lat, currentPos.lng]}
                radius={(Number(mapForm.radius_val) || 10) * (mapForm.radius_unit === 'km' ? 1000 : 1)}
                color="#ef4444"
                dashArray="5,10"
                weight={3}
                fillOpacity={0.15}
              />
            </FeatureGroup>
          )}

          {drawMode === 'rectangle' ? <RectangleDrawHandler isDrawing={isDrawing} onComplete={handleDrawComplete} /> : <RadiusDrawHandler isDrawing={isDrawing} onComplete={handleDrawComplete} />}
          <FeatureGroup>{zones.map(renderZone)}</FeatureGroup>
          {sosAlerts.map(sos => {
            const d = typeof sos.details === 'string' ? JSON.parse(sos.details) : sos.details;
            const ip = sos.is_priority === 1;
            return (
              <Marker key={sos.id} position={[sos.lat, sos.lng]} icon={ip ? priorityIcon : sosIcon}>
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <strong style={{ color: ip ? '#8b5cf6' : '#ef4444' }}>{ip ? '🚨 PRIORITY SOS' : '⚠️ SOS ALERT'}</strong><br />
                    <strong>User:</strong> {sos.device_id || sos.deviceId}<br />
                    <strong>Need:</strong> {d?.medicalNeed || 'General'}<br />
                    <strong>Adults:</strong> {d?.adults || 0} | <strong>Via:</strong> {d?.transport || 'N/A'}<br />
                    <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                      {d?.attachments?.voice ? <a href={typeof d.attachments.voice === 'object' ? d.attachments.voice.data : '#'} download="voice.mp3" style={{ textDecoration: 'none' }}>🔊{(typeof d.attachments.voice === 'object' ? '📸' : '✅')}</a> : '🔊'}
                      {d?.attachments?.camera ? <a href={typeof d.attachments.camera === 'object' ? d.attachments.camera.data : '#'} download="image.jpg" style={{ textDecoration: 'none' }}>📷{(typeof d.attachments.camera === 'object' ? '📸' : '✅')}</a> : '📷'}
                      {d?.attachments?.note ? <a href={typeof d.attachments.note === 'object' ? d.attachments.note.data : '#'} download="note.txt" style={{ textDecoration: 'none' }}>📝{(typeof d.attachments.note === 'object' ? '📸' : '✅')}</a> : '📝'}
                    </div>
                    {d?.needs && <div style={{ marginTop: 4, fontSize: 11 }}>{Object.entries(d.needs).filter(([, v]) => v > 0).map(([k, v]) => <div key={k}>• {k}: {v}</div>)}</div>}
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{sos.timestamp}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
          {rescuers.map(r => (
            <Marker key={r.device_id} position={[r.lat, r.lng]} icon={rescueIcon}>
              <Popup><strong>{r.name}</strong><br />Group: {r.group_id}<br />Status: {r.status}</Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Zone confirm modal */}
        {(pendingZone || pendingRadius) && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header"><h2>Assign Operation Zone</h2><button className="icon-btn" onClick={() => { setPendingZone(null); setPendingRadius(null); }}><X size={20} /></button></div>
              <label className="form-label">Zone Name</label>
              <input className="text-input" value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="Zone Name" />
              <label className="form-label">Operation Type</label>
              <select className="select-input" value={operationType} onChange={e => setOperationType(e.target.value)}>
                {opTypes.map(o => <option key={o.id} value={o.name}>{o.icon} {o.name}</option>)}
              </select>
              <label className="form-label">Assign Group</label>
              <select className="select-input" value={assignedGroup} onChange={e => setAssignedGroup(e.target.value)}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.group_name} ({g.member_count || 0} members)</option>)}
              </select>
              <div className="help-text">✅ Group personnel will be automatically notified of their new task.</div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => { setPendingZone(null); setPendingRadius(null); }}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmZone}><Send size={14} /> Confirm & Dispatch</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANELS ──────────────────────────────────────────────────── */}

      {/* SETTINGS PANEL */}
      {activePanel === 'settings' && (
        <div className="right-panel">
          <div className="panel-header">
            <h2><Settings size={18} /> Settings</h2>
            <button className="icon-btn" onClick={() => setActivePanel(null)}><X size={18} /></button>
          </div>
          <div className="tab-bar">
            {[{ key: 'maps', icon: <Map size={14} />, label: 'Maps' }, { key: 'protocol', icon: <Wifi size={14} />, label: 'Protocol' }, { key: 'sync', icon: <Clock size={14} />, label: 'Sync' }].map(t => (
              <button key={t.key} className={`tab-btn ${settingsTab === t.key ? 'active' : ''}`} onClick={() => setSettingsTab(t.key)}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Maps Tab */}
          {settingsTab === 'maps' && (
            <div className="panel-content">
              <div className="section-title">Download Map Area</div>
              <input className="text-input" placeholder="Map Operation Name" value={mapForm.name} onChange={e => setMapForm(p => ({ ...p, name: e.target.value }))} />
              <div className="radio-group">
                <label><input type="radio" value="radius" checked={mapForm.type === 'radius'} onChange={() => setMapForm(p => ({ ...p, type: 'radius' }))} /> By Radius</label>
                <label><input type="radio" value="region" checked={mapForm.type === 'region'} onChange={() => setMapForm(p => ({ ...p, type: 'region' }))} /> By State/District</label>
              </div>
              {mapForm.type === 'radius' && (
                <div>
                  <label className="form-label">Radius from Current Location</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="text-input" type="number" min="1" max="10000" value={mapForm.radius_val} onChange={e => setMapForm(p => ({ ...p, radius_val: e.target.value }))} style={{ flex: 1 }} />
                    <select className="select-input" value={mapForm.radius_unit} onChange={e => setMapForm(p => ({ ...p, radius_unit: e.target.value }))} style={{ flex: '0 0 90px' }}>
                      <option value="km">Km</option>
                      <option value="m">Meters</option>
                    </select>
                  </div>
                </div>
              )}
              {mapForm.type === 'region' && (
                <div>
                  <input className="text-input" placeholder="State (e.g. Tamil Nadu)" value={mapForm.state} onChange={e => setMapForm(p => ({ ...p, state: e.target.value }))} />
                  <input className="text-input" placeholder="District (optional)" value={mapForm.district} onChange={e => setMapForm(p => ({ ...p, district: e.target.value }))} />
                </div>
              )}
              <button className="btn btn-primary" onClick={downloadMap}><Download size={14} /> Download Map</button>

              <div className="section-title" style={{ marginTop: 20 }}>Downloaded Maps</div>
              {mapCache.length === 0 ? <div className="empty-state">No maps downloaded yet</div> : mapCache.map(m => (
                <div key={m.id} className={`map-cache-item ${loadedMapId === m.id ? 'loaded' : ''}`}>
                  <div style={{ flex: 1 }}>
                    <div className="map-cache-name">{m.name}</div>
                    <div className="map-cache-meta">
                      {m.type === 'radius' ? `📍 ${m.radius_km}km radius` : `🗺️ ${m.state}${m.district ? ' / ' + m.district : ''}`}
                    </div>
                    <div className="map-cache-meta">
                      💾 {m.size_mb}MB · {m.tile_count} tiles · {new Date(m.downloaded_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                    <button className="icon-btn-sm" title="Load" onClick={() => { setLoadedMapId(m.id); toast(`Map "${m.name}" loaded`); }}>▶</button>
                    <button className="icon-btn-sm danger" title="Delete" onClick={() => deleteMap(m.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Protocol Tab */}
          {settingsTab === 'protocol' && (
            <div className="panel-content">
              <div className="section-title">Information Sharing Protocol</div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>Select how data is transmitted between web and mobile devices.</p>
              {['ip', 'sms', 'auto'].map(p => (
                <button key={p} className={`protocol-btn ${protocol === p ? 'active' : ''}`} onClick={() => saveSetting('sharing_protocol', p)}>
                  {p === 'ip' && <><Globe size={18} /><div><strong>IP / Wi-Fi</strong><div className="proto-desc">Direct TCP/IP via Network-in-a-Box</div></div></>}
                  {p === 'sms' && <><MessageSquare size={18} /><div><strong>SMS</strong><div className="proto-desc">Fallback via SMS for offline areas</div></div></>}
                  {p === 'auto' && <><Radio size={18} /><div><strong>Auto Select</strong><div className="proto-desc">System auto-selects best channel</div></div></>}
                  {protocol === p && <Check size={16} style={{ marginLeft: 'auto', color: '#10b981' }} />}
                </button>
              ))}
            </div>
          )}

          {/* Sync Tab */}
          {settingsTab === 'sync' && (
            <div className="panel-content">
              <div className="section-title">SOS Timing Sync Interval</div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>Set how often mobile devices auto-sync with the command center.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="text-input" type="number" min="1" max="999" value={sosInterval} style={{ flex: 1 }}
                  onChange={e => setSettings(p => ({ ...p, sos_interval: e.target.value }))} />
                <select className="select-input" style={{ flex: 1 }} value={sosUnit}
                  onChange={e => { setSettings(p => ({ ...p, sos_interval_unit: e.target.value })); saveSetting('sos_interval_unit', e.target.value); }}>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
              <button className="btn btn-accent" onClick={() => saveSetting('sos_interval', sosInterval)}>Save Interval</button>
              <div className="help-text">Current: SOS sync every <strong>{sosInterval} {sosUnit}</strong></div>
            </div>
          )}
        </div>
      )}

      {/* MENU PANEL */}
      {activePanel === 'menu' && (
        <div className="right-panel">
          <div className="panel-header">
            <h2><Menu size={18} /> Admin Menu</h2>
            <button className="icon-btn" onClick={() => setActivePanel(null)}><X size={18} /></button>
          </div>
          <div className="tab-bar">
            {[{ key: 'rescuers', label: `Rescuers (${users.filter(u => u.role === 'rescuer').length})` }, { key: 'public', label: `Public (${users.filter(u => u.role === 'public').length})` }, { key: 'groups', label: `Groups (${groups.length})` }, { key: 'optypes', label: 'Op Types' }].map(t => (
              <button key={t.key} className={`tab-btn ${menuTab === t.key ? 'active' : ''}`} onClick={() => setMenuTab(t.key)} style={{ fontSize: '11px' }}>{t.label}</button>
            ))}
          </div>

          {/* Rescuers / Public */}
          {(menuTab === 'rescuers' || menuTab === 'public') && (
            <div className="panel-content">
              <div className="section-title">Register New User / Rescuer</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="select-input" value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value }))} style={{ flex: '0 0 120px' }}>
                  <option value="rescuer">Rescuer</option>
                  <option value="public">Public</option>
                </select>
                <input className="text-input" placeholder="Full Name" value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} style={{ flex: 1 }} />
              </div>
              <input className="text-input" placeholder="Phone Number" value={userForm.phone} onChange={e => setUserForm(p => ({ ...p, phone: e.target.value }))} />
              <input className="text-input" placeholder="Device/Unit ID" value={userForm.device_id} onChange={e => setUserForm(p => ({ ...p, device_id: e.target.value }))} />
              <button className="btn btn-primary" onClick={addUser}><Plus size={14} /> Add Registration</button>

              <div className="section-title" style={{ marginTop: 16 }}>{menuTab === 'rescuers' ? 'Registered Rescuers' : 'Registered Public'}</div>
              {users.filter(u => u.role === (menuTab === 'rescuers' ? 'rescuer' : 'public')).map(u => (
                <div key={u.id} className="list-item">
                  <div>
                    <div className="list-item-name">{u.name}</div>
                    <div className="list-item-meta">{u.phone} | {u.device_id || 'No Device'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn-sm" onClick={() => setEditUserModal({ ...u })}><Edit2 size={12} /></button>
                    <button className="icon-btn-sm danger" onClick={() => deleteUser(u.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Groups */}
          {menuTab === 'groups' && (
            <div className="panel-content">
              <div className="section-title">Create Group</div>
              <input className="text-input" placeholder="Group Name" value={groupForm.group_name} onChange={e => setGroupForm(p => ({ ...p, group_name: e.target.value }))} />
              <select className="select-input" value={groupForm.role_type} onChange={e => setGroupForm(p => ({ ...p, role_type: e.target.value }))}>
                <option value="rescue">Rescue</option><option value="medical">Medical</option><option value="food">Food</option><option value="evacuation">Evacuation</option>
              </select>
              <input className="text-input" placeholder="Description (optional)" value={groupForm.description} onChange={e => setGroupForm(p => ({ ...p, description: e.target.value }))} />
              <button className="btn btn-primary" onClick={addGroup}><Plus size={14} /> Create Group</button>

              <div className="section-title" style={{ marginTop: 16 }}>All Groups</div>
              {groups.map(g => (
                <div key={g.id} className="list-item">
                  <div>
                    <div className="list-item-name">{g.group_name}</div>
                    <div className="list-item-meta">{g.role_type} · {g.member_count || g.actual_count || 0} members</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn-sm" title="Members" onClick={() => openGroupMembers(g)}><Users size={12} /></button>
                    <button className="icon-btn-sm" onClick={() => setEditGroupModal({ ...g })}><Edit2 size={12} /></button>
                    <button className="icon-btn-sm danger" onClick={() => deleteGroup(g.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Operation Types */}
          {menuTab === 'optypes' && (
            <div className="panel-content">
              <div className="section-title">Create Operation Type</div>
              <input className="text-input" placeholder="Type Name (e.g. Flood Rescue)" value={opTypeForm.name} onChange={e => setOpTypeForm(p => ({ ...p, name: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="text-input" placeholder="Icon emoji" value={opTypeForm.icon} onChange={e => setOpTypeForm(p => ({ ...p, icon: e.target.value }))} style={{ flex: 1 }} />
                <input type="color" value={opTypeForm.color} onChange={e => setOpTypeForm(p => ({ ...p, color: e.target.value }))} style={{ height: 38, width: 50, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
              </div>
              <input className="text-input" placeholder="Description" value={opTypeForm.description} onChange={e => setOpTypeForm(p => ({ ...p, description: e.target.value }))} />
              <button className="btn btn-primary" onClick={addOpType}><Plus size={14} /> Add Type</button>

              <div className="section-title" style={{ marginTop: 16 }}>Operation Types</div>
              {opTypes.map(o => (
                <div key={o.id} className="list-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{o.icon}</span>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: o.color }}></div>
                    <div>
                      <div className="list-item-name">{o.name}</div>
                      <div className="list-item-meta">{o.description}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn-sm" onClick={() => setEditOpTypeModal({ ...o })}><Edit2 size={12} /></button>
                    <button className="icon-btn-sm danger" onClick={() => deleteOpType(o.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LOG PANEL */}
      {activePanel === 'log' && (
        <div className="right-panel right-panel-wide">
          <div className="panel-header">
            <h2><History size={18} /> Command Timeline</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <a href={`${API}/export/log`} className="header-btn" title="Export CSV" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={14} /></a>
              <button className="icon-btn" onClick={() => setActivePanel(null)}><X size={18} /></button>
            </div>
          </div>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #334155', display: 'flex', gap: 8 }}>
            <input className="text-input" placeholder="Search..." value={logSearch} onChange={e => setLogSearch(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
            <select className="select-input" value={logFilter} onChange={e => setLogFilter(e.target.value)} style={{ width: 140, marginBottom: 0 }}>
              <option value="all">All</option>
              <option value="zone">Zone</option>
              <option value="sos">SOS</option>
              <option value="group">Group</option>
              <option value="user">User</option>
            </select>
          </div>
          <div className="panel-content" style={{ padding: 0 }}>
            {filteredLog.length === 0 ? <div className="empty-state">No log entries</div> : filteredLog.map((l, i) => (
              <div key={l.id || i} className="log-item">
                <div className="log-dot"></div>
                <div className="log-body">
                  <div className="log-action">{l.action}</div>
                  <div className="log-meta">{l.actor} → {l.target}</div>
                  <div className="log-time">{new Date(l.timestamp).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUB-MODALS ────────────────────────────────────────────────────────── */}

      {/* Edit User */}
      {editUserModal && (
        <Modal title="Edit User" onClose={() => setEditUserModal(null)}>
          <input className="text-input" value={editUserModal.name} onChange={e => setEditUserModal(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
          <select className="select-input" value={editUserModal.role} onChange={e => setEditUserModal(p => ({ ...p, role: e.target.value }))}>
            <option value="rescuer">Rescuer</option><option value="public">Public</option>
          </select>
          <input className="text-input" value={editUserModal.phone || ''} onChange={e => setEditUserModal(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" />
          <input className="text-input" value={editUserModal.device_id || ''} onChange={e => setEditUserModal(p => ({ ...p, device_id: e.target.value }))} placeholder="Device ID" />
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setEditUserModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveEditUser}><Check size={14} /> Save</button>
          </div>
        </Modal>
      )}

      {/* Edit Group */}
      {editGroupModal && (
        <Modal title="Edit Group" onClose={() => setEditGroupModal(null)}>
          <input className="text-input" value={editGroupModal.group_name} onChange={e => setEditGroupModal(p => ({ ...p, group_name: e.target.value }))} placeholder="Group Name" />
          <select className="select-input" value={editGroupModal.role_type} onChange={e => setEditGroupModal(p => ({ ...p, role_type: e.target.value }))}>
            <option value="rescue">Rescue</option><option value="medical">Medical</option><option value="food">Food</option><option value="evacuation">Evacuation</option>
          </select>
          <input className="text-input" value={editGroupModal.description || ''} onChange={e => setEditGroupModal(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setEditGroupModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveEditGroup}><Check size={14} /> Save</button>
          </div>
        </Modal>
      )}

      {/* Group Members */}
      {groupMembersModal && (
        <Modal title={`Members: ${groupMembersModal.group_name}`} onClose={() => setGroupMembersModal(null)} wide>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div className="section-title">Current Members</div>
              {groupMembers.length === 0 ? <div className="empty-state">No members</div> : groupMembers.map(m => (
                <div key={m.id} className="list-item">
                  <div><div className="list-item-name">{m.name}</div><div className="list-item-meta">{m.phone}</div></div>
                  <button className="icon-btn-sm danger" onClick={() => removeMemberFromGroup(m.id)}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div className="section-title">Available Rescuers</div>
              {users.filter(u => u.role === 'rescuer' && !groupMembers.find(m => m.id === u.id)).map(u => (
                <div key={u.id} className="list-item">
                  <div><div className="list-item-name">{u.name}</div><div className="list-item-meta">{u.phone}</div></div>
                  <button className="icon-btn-sm" onClick={() => addMemberToGroup(u.id)}><Plus size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Edit OpType */}
      {editOpTypeModal && (
        <Modal title="Edit Operation Type" onClose={() => setEditOpTypeModal(null)}>
          <input className="text-input" value={editOpTypeModal.name} onChange={e => setEditOpTypeModal(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="text-input" value={editOpTypeModal.icon} onChange={e => setEditOpTypeModal(p => ({ ...p, icon: e.target.value }))} placeholder="Icon" style={{ flex: 1 }} />
            <input type="color" value={editOpTypeModal.color} onChange={e => setEditOpTypeModal(p => ({ ...p, color: e.target.value }))} style={{ height: 38, width: 50, border: 'none', borderRadius: 6 }} />
          </div>
          <input className="text-input" value={editOpTypeModal.description || ''} onChange={e => setEditOpTypeModal(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setEditOpTypeModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveEditOpType}><Check size={14} /> Save</button>
          </div>
        </Modal>
      )}

      {/* ── Reassign Task Modal ── */}
      {reassignModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div className="modal-content" style={{ width: 420, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 28 }}>
            <div className="modal-header" style={{ marginBottom: 20 }}>
              <h2 style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 8 }}>🔄 Reassign Task</h2>
              <button className="icon-btn" onClick={() => setReassignModal(null)}><X size={18} /></button>
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: 16, padding: '10px 12px', background: 'rgba(15,23,42,0.6)', borderRadius: 8, borderLeft: '3px solid #3b82f6' }}>
              <strong style={{ color: '#e2e8f0' }}>Task:</strong> {reassignModal.label}
            </div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>Reassign To</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[['group', '👥 Group'], ['individual', '👤 Individual']].map(([val, label]) => (
                <button key={val} onClick={() => setReassignModal(p => ({ ...p, newTarget: val, newTargetId: '' }))}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 6, border: `1px solid ${reassignModal.newTarget === val ? '#3b82f6' : '#334155'}`, background: reassignModal.newTarget === val ? 'rgba(59,130,246,0.15)' : 'transparent', color: reassignModal.newTarget === val ? '#3b82f6' : '#94a3b8', fontWeight: 600, fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {label}
                </button>
              ))}
            </div>
            {reassignModal.newTarget === 'group' ? (
              <select className="select-input" value={reassignModal.newTargetId} onChange={e => setReassignModal(p => ({ ...p, newTargetId: e.target.value }))}>
                <option value="">— Select Group —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.icon || '🛟'} {g.group_name}</option>)}
              </select>
            ) : (
              <select className="select-input" value={reassignModal.newTargetId} onChange={e => setReassignModal(p => ({ ...p, newTargetId: e.target.value }))}>
                <option value="">— Select Rescuer —</option>
                {users.filter(u => u.role === 'rescuer').map(u => <option key={u.id} value={u.phone}>{u.name} ({u.phone})</option>)}
              </select>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setReassignModal(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={executeReassign} style={{ flex: 1 }}>🔄 Confirm Reassign</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
