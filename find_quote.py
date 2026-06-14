import sys

with open('rescuer-app/htmlStr.js', 'r', encoding='utf-8') as f:
    text = f.read()

start_idx = text.find('export const htmlString = "')
if start_idx == -1:
    print("Could not find start of string")
    sys.exit(1)

start = start_idx + len('export const htmlString = "')

i = start
while i < len(text):
    if text[i] == '\\':
        i += 2
        continue
    if text[i] == '"':
        print(f"Found unescaped quote at {i}")
        print(text[max(0, i-100):min(len(text), i+100)].encode('utf-8'))
        break
    i += 1
