import requests
import json

try:
    resp = requests.get('http://192.168.1.4:3001/api/users')
    users = resp.json()
    print("Total users returned:", len(users))
    names = [u.get('name') for u in users]
    print("Names:", names)
    
    # Let's count duplicates
    from collections import Counter
    counts = Counter(names)
    print("Duplicates:", {k:v for k,v in counts.items() if v > 1})
except Exception as e:
    print("Error:", e)
