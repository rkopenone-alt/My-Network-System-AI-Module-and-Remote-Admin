import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('system-backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

for match in re.finditer(r'app\.post\(\'/api/users/login\'.*?\}\);', content, re.IGNORECASE | re.DOTALL):
    print("login logic:", match.group(0))
