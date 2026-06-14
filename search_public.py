with open('public-sos-app/htmlStr.js', 'r', encoding='utf-8') as f:
    t = f.read()
    
idx = t.find("Settings")
if idx > -1:
    print(t[max(0, idx-200) : min(len(t), idx+500)])
else:
    print("Settings not found")

idx2 = t.find('id="page-')
if idx2 > -1:
    print(t[max(0, idx2-200) : min(len(t), idx2+500)])
else:
    print('page- not found')

idx3 = t.find('settings-group')
if idx3 > -1:
    print(t[max(0, idx3-200) : min(len(t), idx3+500)])
else:
    print('settings-group not found')

idx4 = t.find('nav(')
if idx4 > -1:
    print(t[max(0, idx4-200) : min(len(t), idx4+500)])
else:
    print('nav() not found')
