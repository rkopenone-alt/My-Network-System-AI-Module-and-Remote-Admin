import os
import re

def fix_rescuer(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = f.read()

    # Restore caching in fetchHistory
    new_fetch_history = '''
                try {
                    const res = await fetch(${this.API}/users//combined-history);
                    if (res.ok) {
                        rawHistory = await res.json();
                        try {
                            const histCacheKey = 'cache_' + this.API + '/users/' + this.user.id + '/combined-history';
                            localStorage.setItem(histCacheKey, JSON.stringify(rawHistory));
                        } catch(e) {}
                    }
                } catch (e) {
                    console.error('Fetch history failed:', e);
                }

                // Fallback to cache if rawHistory is not an array or is empty
                if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
                    const histCacheKey = 'cache_' + this.API + '/users/' + this.user.id + '/combined-history';
                    const cached = localStorage.getItem(histCacheKey);
                    if (cached) {
                        try {
                            rawHistory = JSON.parse(cached);
                        } catch(err) {}
                    }
                }

                if (!Array.isArray(rawHistory)) {
                    rawHistory = [];
                }
'''
    # Replace the offline behavior I added
    offline_behavior_regex = r"try \{\s*const res = await fetch\(\$\{this\.API\}/users/\$\{this\.user\.id\}/combined-history\);\s*if \(res\.ok\) \{\s*rawHistory = await res\.json\(\);\s*\}\s*\} catch \(e\) \{\s*console\.error\('Fetch history failed:', e\);\s*\}\s*// Offline behavior: Keep history blank\s*if \(\!Array\.isArray\(rawHistory\)\) \{\s*rawHistory = \[\];\s*\}"
    data = re.sub(offline_behavior_regex, new_fetch_history.strip(), data, flags=re.MULTILINE)

    # Add correct logout cache clearing
    correct_logout = '''logout() {
                localStorage.removeItem('rescue_user_v3');
                localStorage.removeItem('rescuer_token');
                
                // Clear all history cache entries correctly
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('cache_')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
                
                this.allHistory = []; // Reset local memory'''

    data = data.replace('''logout() {
                localStorage.removeItem('rescue_user_v3');
                localStorage.removeItem('rescuer_token');
                
                
                this.allHistory = []; // Reset local memory''', correct_logout)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(data)

def fix_public(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = f.read()

    new_fetch_public = '''
                try {
                    const phoneParams = phone=&device_id=;
                    const res = await fetch(${this.API}/rescue-requests/my-history?);
                    if (res.ok) {
                        const data = await res.json();
                        this.rawData.myHistory = data;
                        localStorage.setItem(cached_my_history_, JSON.stringify(this.rawData.myHistory));
                        this.renderStatusUI();
                        
                        // Update ticker based on active request
                        const activeReq = this.rawData.myHistory.find(r => r.status !== 'completed' && r.status !== 'declined');
                        if (activeReq) {
                            if (activeReq.status === 'accepted') this.updateStatusUI('TEAM_ASSIGNED', 'Rescue team has been dispatched!', '?');
                            else if (activeReq.status === 'assigned') this.updateStatusUI('DISPATCHED', 'Team assigned, pending acceptance.', '?');
                            else if (activeReq.status === 'ongoing') this.updateStatusUI('APPROACHING', 'Rescue team is on the way!', '??');
                            else this.updateStatusUI('PENDING', 'Waiting for available team...', '?');
                        } else {
                            const ticker = document.getElementById('sosStatusTicker');
                            if (ticker) ticker.style.display = 'none';
                        }
                    } else {
                    }
                } catch (e) {
                    console.error("History fetch failed, trying local cache:", e);
                    const cached = localStorage.getItem(cached_my_history_);
                    if (cached) {
                        this.rawData.myHistory = JSON.parse(cached);
                        this.renderStatusUI();
                    }
                }
'''
    old_fetch_public_regex = r"try \{\s*const phoneParams = .*?;\s*const res = await fetch.*?;\s*if \(res\.ok\) \{.*?this\.rawData\.myHistory = data;\s*this\.renderStatusUI\(\);.*?\} else \{\s*\}\s*\} catch \(e\) \{\s*console\.error\(\"History fetch failed\. Showing blank history\.\"\);\s*this\.rawData\.myHistory = \[\];\s*this\.renderStatusUI\(\);\s*\}"
    data = re.sub(old_fetch_public_regex, new_fetch_public.strip(), data, flags=re.DOTALL)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(data)

fix_rescuer('preview-rescuer.html')
fix_public('preview-mobile-app.html')
print("Restored cache functionality safely")
