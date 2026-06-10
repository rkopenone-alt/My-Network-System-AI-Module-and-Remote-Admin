import os
from PIL import Image, ImageDraw, ImageFont

def create_icon(text, size=(1024, 1024), bg_color="white", text_color="#1e3a8a", file_path="icon.png"):
    img = Image.new('RGBA', size, color=bg_color)
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", int(size[0]*0.15))
    except:
        font = ImageFont.load_default()
    
    # Calculate text bounding box
    bbox = d.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    
    # Draw text in the center
    d.text(((size[0]-w)/2, (size[1]-h)/2), text, font=font, fill=text_color)
    
    # Add a thin blue border to make it look nicer
    d.rectangle([0, 0, size[0]-1, size[1]-1], outline=text_color, width=int(size[0]*0.02))
    
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    img.save(file_path)

if __name__ == "__main__":
    assets_dir = "admin-app/assets"
    create_icon("ARDMS\nADMIN", size=(1024, 1024), file_path=os.path.join(assets_dir, "icon.png"))
    create_icon("ARDMS\nADMIN", size=(2048, 2048), file_path=os.path.join(assets_dir, "splash-icon.png"))
    create_icon("ARDMS\nADMIN", size=(1024, 1024), file_path=os.path.join(assets_dir, "adaptive-icon.png"), bg_color="white")
    create_icon("A", size=(256, 256), file_path=os.path.join(assets_dir, "favicon.png"))
    print("New Admin icons generated successfully.")
