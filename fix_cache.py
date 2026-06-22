import os

def fix_rescuer(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = f.read()

    # Remove history caching
    old_fetch_history = '''try {
                            const histCacheKey = 'cache_' + this.API + '/users/' + this.user.id + '/combined-history';
                            localStorage.setItem(histCacheKey, JSON.stringify(rawHistory));
                        } catch(e) {}'''
    data = data.replace(old_fetch_history, '')

    old_fallback = '''// Fallback to cache if rawHistory is not an array or is empty
                if (!Array.isArray(rawHistory) || rawHistory.length === 0) {
                    const histCacheKey = 'cache_' + this.API + '/users/' + this.user.id + '/combined-history';
                    const cached = localStorage.getItem(histCacheKey);
                    if (cached) {
                        try {
                            rawHistory = JSON.parse(cached);
                        } catch(err) {}
                    }
                }'''
    data = data.replace(old_fallback, '''// Offline behavior: Keep history blank
                if (!Array.isArray(rawHistory)) {
                    rawHistory = [];
                }''')

    old_logout_cache = '''// Clear all history cache entries
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('cache_')) {
                        localStorage.removeItem(key);
                    }
                }'''
    data = data.replace(old_logout_cache, '')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(data)

def fix_public(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = f.read()

    old_fetch_cache = '''localStorage.setItem(cached_my_history_, JSON.stringify(this.rawData.myHistory));'''
    data = data.replace(old_fetch_cache, '')

    old_fallback = '''console.error("History fetch failed, trying local cache:", e);
                    const cached = localStorage.getItem(cached_my_history_);
                    if (cached) {
                        this.rawData.myHistory = JSON.parse(cached);
                        this.renderStatusUI();
                    }'''
    data = data.replace(old_fallback, '''console.error("History fetch failed. Showing blank history.");
                    this.rawData.myHistory = [];
                    this.renderStatusUI();''')
                    
    old_logout = '''logout() {
                localStorage.removeItem('public_user_v3');
                this.user = null;
                this.showScreen('screenLogin');
            },'''
    new_logout = '''logout() {
                localStorage.removeItem('public_user_v3');
                this.user = null;
                this.rawData.myHistory = [];
                this.showScreen('screenLogin');
            },'''
    data = data.replace(old_logout, new_logout)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(data)

fix_rescuer('preview-rescuer.html')
fix_public('preview-mobile-app.html')
print("Fixed caching in HTML files")
