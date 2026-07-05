import re

raw_admin = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\raw_admin.html"

with open(raw_admin, "r", encoding="utf-8") as f:
    html = f.read()

# 1. Remove @media (max-width: 1024px) blocks
# There are multiple blocks. We can use a regex to match the block until the matching closing brace.
# To be safer, let's just do a manual stack-based parser or simpler regex for `@media (max-width: 1024px) { ... }`

def remove_media_queries(text):
    while "@media (max-width: 1024px) {" in text:
        start_idx = text.find("@media (max-width: 1024px) {")
        open_braces = 0
        end_idx = start_idx
        found_first = False
        for i in range(start_idx, len(text)):
            if text[i] == '{':
                open_braces += 1
                found_first = True
            elif text[i] == '}':
                open_braces -= 1
            
            if found_first and open_braces == 0:
                end_idx = i + 1
                break
        
        # Remove the block
        text = text[:start_idx] + text[end_idx:]
    return text

html_new = remove_media_queries(html)

# 2. Add cache-buster to originalFetch
# Find: const response = await originalFetch(url, options);
# Replace with:
# let fetchUrl = url;
# if (method === 'GET' && isApi) { fetchUrl = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now(); }
# const response = await originalFetch(fetchUrl, options);

fetch_find = "const response = await originalFetch(url, options);"
fetch_replace = """let fetchUrl = url;
                    if (method === 'GET' && isApi) {
                        fetchUrl = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
                    }
                    const response = await originalFetch(fetchUrl, options);"""

if fetch_find in html_new and fetch_replace not in html_new:
    html_new = html_new.replace(fetch_find, fetch_replace)

with open(raw_admin, "w", encoding="utf-8") as f:
    f.write(html_new)
print("raw_admin.html updated successfully!")
