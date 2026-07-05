import re

pdf_file = "generate_pdf.py"

with open(pdf_file, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Define add_image helper function
add_image_def = """
# Helpers
def add_image(filename, w):
    try:
        from PIL import Image
        img = Image.open(filename)
        aspect = img.height / img.width
        h = w * aspect
        pdf.image(filename, w=w)
        pdf.ln(h + 3)
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        pdf.ln(5)
"""

code = code.replace("# Helpers", add_image_def)

# 2. Replace all manual image additions
# Look for pattern:
# try:
#     pdf.image('...', w=...)
#     pdf.ln(...)
# except Exception: pass
#
# We can replace each specifically to make sure we don't break anything.

image_replacements = [
    (
        """try:
    pdf.image('master_flow.png', w=160)
    pdf.ln(5)
except Exception: pass""",
        "add_image('master_flow.png', 160)"
    ),
    (
        """try:
    pdf.image('public_home.png', w=60)
    pdf.ln(5)
except Exception: pass""",
        "add_image('public_home.png', 60)"
    ),
    (
        """try:
    pdf.image('public_sos.png', w=60)
    pdf.ln(5)
except Exception: pass""",
        "add_image('public_sos.png', 60)"
    ),
    (
        """try:
    pdf.image('admin_assign.png', w=130)
    pdf.ln(5)
except Exception: pass""",
        "add_image('admin_assign.png', 130)"
    ),
    (
        """try:
    pdf.image('admin_group.png', w=130)
    pdf.ln(5)
except Exception: pass""",
        "add_image('admin_group.png', 130)"
    ),
    (
        """try:
    pdf.image('rescuer_accept.png', w=60)
    pdf.ln(5)
except Exception: pass""",
        "add_image('rescuer_accept.png', 60)"
    ),
    (
        """try:
    pdf.image('rescuer_nav.png', w=60)
    pdf.ln(5)
except Exception: pass""",
        "add_image('rescuer_nav.png', 60)"
    ),
    (
        """try:
    pdf.image('rescuer_history.png', w=60)
    pdf.ln(5)
except Exception: pass""",
        "add_image('rescuer_history.png', 60)"
    )
]

for old, new in image_replacements:
    # Normalize whitespaces for replacing just in case
    old_norm = re.sub(r'\s+', ' ', old)
    # Let's do a direct replacement first
    if old in code:
        code = code.replace(old, new)
        print(f"Replaced image call with add_image: {new}")
    else:
        # Try finding with flexible spacing
        pattern = re.escape(old).replace(r'\ ', r'\s+').replace(r'\n', r'\s+')
        match = re.search(pattern, code)
        if match:
            code = code[:match.start()] + new + code[match.end():]
            print(f"Regex replaced image call: {new}")
        else:
            print(f"Warning: could not find match for: {old[:30]}...")

# 3. Rename the output file
code = code.replace('pdf.output("ARDMS_Project_Report_User_Manual_v6.pdf")', 'pdf.output("ARDMS_Project_Report_User_Manual.pdf")')
code = code.replace('print("PDF saved to ARDMS_Project_Report_User_Manual_v6.pdf")', 'print("PDF saved to ARDMS_Project_Report_User_Manual.pdf")')

with open(pdf_file, "w", encoding="utf-8") as f:
    f.write(code)

print("generate_pdf.py patched successfully!")
