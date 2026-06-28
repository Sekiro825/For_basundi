import os
import re
from PIL import Image, ImageDraw, ImageFont

# Source folder and output folder
src_folder = os.path.dirname(os.path.abspath(__file__))
out_folder = os.path.join(src_folder, "processed_collages")
os.makedirs(out_folder, exist_ok=True)

# Font paths on Windows
font_path = r"C:\Windows\Fonts\segoepr.ttf" # Segoe Print (Handwriting)
if not os.path.exists(font_path):
    font_path = r"C:\Windows\Fonts\comic.ttf" # Comic Sans fallback
if not os.path.exists(font_path):
    font_path = None

def parse_date(filename):
    # Extract date from Screenshot_YYYY-MM-DD-HH-MM-SS...
    match = re.search(r"Screenshot_(\d{4})-(\d{2})-(\d{2})", filename)
    if match:
        year, month, day = match.groups()
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        return f"{months[int(month)-1]} {int(day)}, {year}"
    return "Our Memory"

def draw_little_heart(draw, x, y, size=15):
    # Draw a cute little red heart shape
    draw.polygon([
        (x, y + size//3), (x - size//2, y - size//3), (x - size//4, y - size),
        (x, y - size//2), (x + size//4, y - size), (x + size//2, y - size//3)
    ], fill=(230, 75, 115, 255))

def create_polaroid(face_img, label, date_str):
    # Create polaroid frame: 600x720 (white)
    pol = Image.new("RGBA", (600, 720), (255, 255, 255, 255))
    
    # Resize face image to 540x540
    face_resized = face_img.resize((540, 540), Image.Resampling.LANCZOS)
    
    # Paste face onto polaroid
    pol.paste(face_resized, (30, 30))
    
    draw = ImageDraw.Draw(pol)
    try:
        f_label = ImageFont.truetype(font_path, 34) if font_path else ImageFont.load_default()
        f_date = ImageFont.truetype(font_path, 22) if font_path else ImageFont.load_default()
    except Exception:
        f_label = f_date = ImageFont.load_default()

    # Draw label and date
    lbl_w = draw.textlength(label, font=f_label) if hasattr(draw, "textlength") else 100
    date_w = draw.textlength(date_str, font=f_date) if hasattr(draw, "textlength") else 100

    draw.text((300 - lbl_w/2, 580), label, fill=(60, 60, 60, 255), font=f_label)
    draw.text((300 - date_w/2, 645), date_str, fill=(130, 130, 130, 255), font=f_date)
    
    # Draw a small heart next to the label
    draw_little_heart(draw, int(300 + lbl_w/2 + 20), 605, size=18)
    
    # Draw outer border
    draw.rectangle([0, 0, 599, 719], outline=(225, 225, 225, 255), width=1)
    
    return pol

# Process all screenshots
files = [f for f in os.listdir(src_folder) if f.startswith("Screenshot_") and f.endswith(".jpg")]
files.sort()

print(f"Found {len(files)} video call screenshots.")
print("Processing them into cute polaroid collages...")

processed_count = 0
for f in files:
    try:
        img = Image.open(os.path.join(src_folder, f))
        w, h = img.size
        
        # Crop PIP window (Saket) - focus on face
        saket_face = img.crop((int(w * 0.63), int(h * 0.12), int(w * 0.95), int(h * 0.31)))
        
        # Crop Main window (Grishma) - focus on face
        grishma_face = img.crop((int(w * 0.15), int(h * 0.38), int(w * 0.85), int(h * 0.73)))
        
        # Format date
        date_str = parse_date(f)
        
        # Create polaroid cards
        pol_grishma = create_polaroid(grishma_face, "Her", date_str)
        pol_saket = create_polaroid(saket_face, "Him", date_str)
        
        # Create collage canvas (lavender blush background)
        canvas = Image.new("RGBA", (1400, 950), (255, 240, 245, 255))
        
        # Rotate polaroids for a scrapbook scattered style
        pol_g_rot = pol_grishma.rotate(-5, resample=Image.Resampling.BICUBIC, expand=True)
        pol_s_rot = pol_saket.rotate(5, resample=Image.Resampling.BICUBIC, expand=True)
        
        g_w, g_h = pol_g_rot.size
        s_w, s_h = pol_s_rot.size
        
        # Paste them side by side
        canvas.alpha_composite(pol_g_rot, (150 - (g_w - 600) // 2, 120 - (g_h - 720) // 2))
        canvas.alpha_composite(pol_s_rot, (680 - (s_w - 600) // 2, 120 - (s_h - 720) // 2))
        
        # Draw romantic page title
        draw_c = ImageDraw.Draw(canvas)
        title_str = "Our Long Distance Moments"
        try:
            f_title = ImageFont.truetype(font_path, 40) if font_path else ImageFont.load_default()
            title_w = draw_c.textlength(title_str, font=f_title) if hasattr(draw_c, "textlength") else 200
        except Exception:
            f_title = ImageFont.load_default()
            title_w = 200
            
        draw_c.text((700 - title_w/2, 45), title_str, fill=(219, 112, 147, 255), font=f_title)
        draw_little_heart(draw_c, int(700 + title_w/2 + 25), 70, size=24)
        
        # Save output collage
        out_name = f"collage_{f}"
        canvas.convert("RGB").save(os.path.join(out_folder, out_name), "JPEG")
        processed_count += 1
    except Exception as e:
        print(f"Error processing {f}: {e}")

print(f"\nSuccessfully generated {processed_count} collages in:\n{out_folder}")
