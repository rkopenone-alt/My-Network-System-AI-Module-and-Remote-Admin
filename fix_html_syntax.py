import os

path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js"
with open(path, "r", encoding="utf8") as f:
    data = f.read()

# The broken injection
bad_text = """                        if (data.type === 'RESCUER_DECLINED_LAST') {
                            Swal.fire({
                                icon: 'error',
                                title: 'Task Declined By Rescuer!',
                                html: `The assigned rescuer has declined the task, and no other eligible AI-assignable rescuers are available.<br><br><b>Task Details:</b><br>${data.data?.details || 'N/A'}<br><b>Location:</b> ${data.data?.sector || 'Unknown'}<br><br><b>Please manually assign this task or trigger a manual command!</b>`,
                                confirmButtonText: 'Understood'
                            });
                            refreshAllModules();
                            return;
                        }"""

# Properly escaped injection for htmlStr.js
good_text = """                        if (data.type === 'RESCUER_DECLINED_LAST') {
                            Swal.fire({
                                icon: 'error',
                                title: 'Task Declined By Rescuer!',
                                html: `The assigned rescuer has declined the task, and no other eligible AI-assignable rescuers are available.<br><br><b>Task Details:</b><br>\\${data.data?.details || 'N/A'}<br><b>Location:</b> \\${data.data?.sector || 'Unknown'}<br><br><b>Please manually assign this task or trigger a manual command!</b>`,
                                confirmButtonText: 'Understood'
                            });
                            refreshAllModules();
                            return;
                        }"""

# Wait, the backticks ALSO need to be escaped!
good_text = good_text.replace("`The assigned rescuer", "\\`The assigned rescuer")
good_text = good_text.replace("manual command!</b>`", "manual command!</b>\\`")

data = data.replace(bad_text, good_text)

with open(path, "w", encoding="utf8") as f:
    f.write(data)
print("Escaped backticks fixed!")
