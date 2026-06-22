import json

def compile_html(html_path, js_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    js_content = f"export const htmlString = {json.dumps(html)};\n"
    
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(js_content)

compile_html('preview-rescuer.html', 'rescuer-app/htmlStr.js')
compile_html('preview-mobile-app.html', 'public-sos-app/htmlStr.js')
print("Compiled HTML to JS")
