import os

path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js"
with open(path, "r", encoding="utf8") as f:
    data = f.read()

old_update_types = """                        const updateTypes = [
                            'NEW_RESCUE_REQUEST', 'RESCUE_REQUEST_ACCEPTED', 'RESCUE_REQUEST_DECLINED',
                            'RESCUE_REQUEST_UPDATE', 'COMMAND_STATUS_UPDATE', 'RESCUE_REQUEST_COMPLETED',
                            'SOS_ALERT', 'RESCUER_UPDATE', 'NEW_COMMAND', 'AI_STATUS_UPDATE', 'RESCUER_DECLINED_LAST'
                        ];"""

new_update_types = """                        const updateTypes = [
                            'NEW_RESCUE_REQUEST', 'RESCUE_REQUEST_ACCEPTED', 'RESCUE_REQUEST_DECLINED',
                            'RESCUE_REQUEST_UPDATE', 'COMMAND_STATUS_UPDATE', 'RESCUE_REQUEST_COMPLETED',
                            'SOS_ALERT', 'RESCUER_UPDATE', 'NEW_COMMAND', 'AI_STATUS_UPDATE', 'RESCUER_DECLINED_LAST', 'RESCUE_REQUEST_DECLINED_REASSIGN'
                        ];"""
data = data.replace(old_update_types, new_update_types)

old_refresh = """                            if (data.type === 'SOS_ALERT') {
        if (window.currentSosAudio) { window.currentSosAudio.pause(); }
        window.currentSosAudio = new Audio('data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
        window.currentSosAudio.loop = true;
        window.currentSosAudio.play().catch(e => console.log('Audio error', e));
                                showAdminToast(`🚨 SOS Alert: ${data.data?.details?.message || 'Incoming alert'}`);
                                if (typeof showSosAlertModal === 'function') showSosAlertModal(data.data);
                            }

                            refreshAllModules();"""

new_refresh = """                            if (data.type === 'SOS_ALERT') {
        if (window.currentSosAudio) { window.currentSosAudio.pause(); }
        window.currentSosAudio = new Audio('data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
        window.currentSosAudio.loop = true;
        window.currentSosAudio.play().catch(e => console.log('Audio error', e));
                                showAdminToast(`🚨 SOS Alert: ${data.data?.details?.message || 'Incoming alert'}`);
                                if (typeof showSosAlertModal === 'function') showSosAlertModal(data.data);
                            }
                            if (data.type === 'RESCUE_REQUEST_DECLINED_REASSIGN') {
                                showAdminToast(`⚠️ Task Declined, AI is reassigning...`);
                            }

                            refreshAllModules();"""
data = data.replace(old_refresh, new_refresh)

with open(path, "w", encoding="utf8") as f:
    f.write(data)
print("Admin App patched for RESCUE_REQUEST_DECLINED_REASSIGN.")
