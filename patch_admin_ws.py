import os

path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js"
with open(path, "r", encoding="utf8") as f:
    data = f.read()

old_ws_code = """                        const updateTypes = [
                            'NEW_RESCUE_REQUEST', 'RESCUE_REQUEST_ACCEPTED', 'RESCUE_REQUEST_DECLINED',
                            'RESCUE_REQUEST_UPDATE', 'COMMAND_STATUS_UPDATE', 'RESCUE_REQUEST_COMPLETED',
                            'SOS_ALERT', 'RESCUER_UPDATE', 'NEW_COMMAND', 'AI_STATUS_UPDATE'
                        ];

                        if (data.type === 'AI_STATUS_UPDATE') {"""

new_ws_code = """                        const updateTypes = [
                            'NEW_RESCUE_REQUEST', 'RESCUE_REQUEST_ACCEPTED', 'RESCUE_REQUEST_DECLINED',
                            'RESCUE_REQUEST_UPDATE', 'COMMAND_STATUS_UPDATE', 'RESCUE_REQUEST_COMPLETED',
                            'SOS_ALERT', 'RESCUER_UPDATE', 'NEW_COMMAND', 'AI_STATUS_UPDATE', 'RESCUER_DECLINED_LAST'
                        ];

                        if (data.type === 'RESCUER_DECLINED_LAST') {
                            Swal.fire({
                                icon: 'error',
                                title: 'Task Declined By Rescuer!',
                                html: `The assigned rescuer has declined the task, and no other eligible AI-assignable rescuers are available.<br><br><b>Task Details:</b><br>${data.data?.details || 'N/A'}<br><b>Location:</b> ${data.data?.sector || 'Unknown'}<br><br><b>Please manually assign this task or trigger a manual command!</b>`,
                                confirmButtonText: 'Understood'
                            });
                            refreshAllModules();
                            return;
                        }

                        if (data.type === 'AI_STATUS_UPDATE') {"""

data = data.replace(old_ws_code, new_ws_code)

with open(path, "w", encoding="utf8") as f:
    f.write(data)
print("Admin App WS patched!")
