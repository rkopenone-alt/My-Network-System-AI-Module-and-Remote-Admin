import re

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    for line in f:
        if 'app.get(' in line:
            print(line.strip())
