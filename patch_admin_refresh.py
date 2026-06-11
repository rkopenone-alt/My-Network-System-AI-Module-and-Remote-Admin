import os

path = r"c:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\admin-app\htmlStr.js"
with open(path, "r", encoding="utf8") as f:
    data = f.read()

old_autorefresh = """        function startAutoRefresh(seconds) {
            if (refreshTimer) clearInterval(refreshTimer);
            console.log(`[Admin] Background polling disabled. Relying purely on WebSocket pushes for real-time updates.`);

            const runAll = () => {
                fetchUsers();
                fetchGroups();
                fetchRescueRequests();
                fetchDashboardStats();
                fetchCommands();
                if (typeof updateTacticalMap === 'function') updateTacticalMap(true);
            };

            // Run once to initialize
            runAll();
        }"""

new_autorefresh = """        function startAutoRefresh(seconds) {
            if (refreshTimer) clearInterval(refreshTimer);
            console.log(`[Admin] Background polling configured for ${seconds}s interval.`);

            const runAll = () => {
                fetchUsers();
                fetchGroups();
                fetchRescueRequests();
                fetchDashboardStats();
                fetchCommands();
                if (typeof updateTacticalMap === 'function') updateTacticalMap(true);
            };

            // Run once to initialize
            runAll();
            
            if (seconds > 0) {
                refreshTimer = setInterval(runAll, seconds * 1000);
            }
        }"""

data = data.replace(old_autorefresh, new_autorefresh)

with open(path, "w", encoding="utf8") as f:
    f.write(data)
print("Auto-refresh enabled!")
