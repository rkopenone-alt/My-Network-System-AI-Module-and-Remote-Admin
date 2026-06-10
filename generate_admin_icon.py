from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(text, size=(1024, 1024), bg_color="#10b981", text_color="white", file_path="icon.png"):
    img = Image.new('RGBA', size, color=bg_color)
    d = ImageDraw.Draw(img)
    try:
        # Try to use a default truetype font if available, else fallback
        font = ImageFont.truetype("arial.ttf", int(size[0]*0.2))
    except:
        font = ImageFont.load_default()
    
    # Calculate text bounding box
    bbox = d.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    
    # Draw text in the center
    d.text(((size[0]-w)/2, (size[1]-h)/2), text, font=font, fill=text_color)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    img.save(file_path)

if __name__ == "__main__":
    assets_dir = "admin-app/assets"
    create_icon("ADMIN", size=(1024, 1024), file_path=os.path.join(assets_dir, "icon.png"))
    create_icon("ADMIN", size=(2048, 2048), file_path=os.path.join(assets_dir, "splash-icon.png"))
    create_icon("ADMIN", size=(1024, 1024), file_path=os.path.join(assets_dir, "adaptive-icon.png"), bg_color=(0,0,0,0))
    create_icon("A", size=(256, 256), file_path=os.path.join(assets_dir, "favicon.png"))
    print("Admin icons generated successfully.")
