raw_admin = r"C:\Users\Alienware\Desktop\Rescue Backup AI 09-06-2026\raw_admin.html"

with open(raw_admin, "r", encoding="utf-8") as f:
    html = f.read()

# Change viewport to target a fixed desktop width of 1280px so it acts exactly like a desktop site
old_viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">'
new_viewport = '<meta name="viewport" content="width=1280, initial-scale=0.3, minimum-scale=0.1, maximum-scale=5.0, user-scalable=yes">'

if old_viewport in html:
    html = html.replace(old_viewport, new_viewport)
    print("Viewport tag updated successfully.")
else:
    print("Viewport tag not found, searching for other viewport tags.")
    # Fallback replacement if viewport tag varies slightly
    import re
    html = re.sub(r'<meta name="viewport"[^>]+>', new_viewport, html)
    print("Regex viewport tag updated.")

with open(raw_admin, "w", encoding="utf-8") as f:
    f.write(html)
