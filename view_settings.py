with open('public-sos-app/htmlStr.js', 'r', encoding='utf-8') as f:
    t = f.read()

idx = t.find('screenSettings')
if idx > -1:
    print(t[max(0, idx-50) : min(len(t), idx+2000)])
else:
    print("screenSettings not found")
