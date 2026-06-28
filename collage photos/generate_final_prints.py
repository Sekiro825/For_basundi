import os
import json
import random
from PIL import Image, ImageEnhance, ImageDraw, ImageChops, ImageFilter, ImageFont

# Path configuration
src_folder = os.path.dirname(os.path.abspath(__file__))
out_folder = os.path.join(src_folder, "final_instax_prints")
os.makedirs(out_folder, exist_ok=True)

# Font configurations on Windows
font_path_segoe = r"C:\Windows\Fonts\segoepr.ttf" # Segoe Print (Handwriting)
font_path_courier = r"C:\Windows\Fonts\courbd.ttf" # Courier Bold (Typewriter)
font_path_arial = r"C:\Windows\Fonts\arial.ttf" # Arial
if not os.path.exists(font_path_segoe):
    font_path_segoe = r"C:\Windows\Fonts\comic.ttf"
if not os.path.exists(font_path_courier):
    font_path_courier = r"C:\Windows\Fonts\couri.ttf"
if not os.path.exists(font_path_arial):
    font_path_arial = None

# Helper: Draw 7-segment display for timestamps
def draw_7segment_digit(draw, x, y, char, size=1.0, color=(255, 102, 0)):
    w = int(20 * size)
    h = int(36 * size)
    t = max(1, int(3 * size))
    
    segs = {
        0: (t, 0, w - t, t),                 # Top
        1: (0, t, t, h//2 - t//2),           # Top-Left
        2: (w - t, t, w, h//2 - t//2),       # Top-Right
        3: (t, h//2 - t//2, w - t, h//2 + t//2), # Middle
        4: (0, h//2 + t//2, t, h - t),       # Bottom-Left
        5: (w - t, h//2 + t//2, w, h - t),   # Bottom-Right
        6: (t, h - t, w - t, h)              # Bottom
    }
    
    char_map = {
        '0': [0, 1, 2, 4, 5, 6],
        '1': [2, 5],
        '2': [0, 2, 3, 4, 6],
        '3': [0, 2, 3, 5, 6],
        '4': [1, 2, 3, 5],
        '5': [0, 1, 3, 5, 6],
        '6': [0, 1, 3, 4, 5, 6],
        '7': [0, 2, 5],
        '8': [0, 1, 2, 3, 4, 5, 6],
        '9': [0, 1, 2, 3, 5, 6],
        '-': [3],
        ' ': []
    }
    
    active_segs = char_map.get(char, [])
    for s_idx in active_segs:
        sx1, sy1, sx2, sy2 = segs[s_idx]
        draw.rectangle([x + sx1, y + sy1, x + sx2, y + sy2], fill=color)

def draw_datestamp(img, date_str, color=(255, 85, 0)):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    w, h = img.size
    size = max(0.5, w / 1000.0)
    char_w = int(24 * size)
    char_h = int(36 * size)
    spacing = int(6 * size)
    
    total_w = len(date_str) * (char_w + spacing) - spacing
    start_x = w - total_w - int(30 * size)
    start_y = h - char_h - int(30 * size)
    
    x = start_x
    for char in date_str:
        if char == '.':
            dot_size = max(2, int(4 * size))
            draw.rectangle([x + char_w//2 - dot_size//2, start_y + char_h - dot_size, 
                            x + char_w//2 + dot_size//2, start_y + char_h], fill=color)
        else:
            draw_7segment_digit(draw, x, start_y, char, size=size, color=color)
        x += char_w + spacing
        
    glow = overlay.filter(ImageFilter.GaussianBlur(radius=max(1, int(1.2 * size))))
    img_rgba = img.convert("RGBA")
    img_rgba = Image.alpha_composite(img_rgba, glow)
    img_rgba = Image.alpha_composite(img_rgba, overlay)
    return img_rgba.convert("RGB")

# Helper: Draw Sparkles (Style 1 and 3)
def draw_sparkle(draw, cx, cy, r, color):
    points = [
        (cx, cy - r), (cx + r//3, cy - r//3), (cx + r, cy), (cx + r//3, cy + r//3),
        (cx, cy + r), (cx - r//3, cy + r//3), (cx - r, cy), (cx - r//3, cy - r//3)
    ]
    draw.polygon(points, fill=color)

# Helper: Draw Hearts
def draw_heart(draw, cx, cy, size, color):
    draw.polygon([
        (cx, cy + size//3), (cx - size//2, cy - size//3), (cx - size//4, cy - size),
        (cx, cy - size//2), (cx + size//4, cy - size), (cx + size//2, cy - size//3)
    ], fill=color)

# Helper: Draw Washi Tape
def draw_washi_tape(img, color=(255, 192, 203, 140)):
    tape = Image.new("RGBA", (220, 60), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tape)
    points = [(10, 10)]
    for y in range(10, 50, 5):
        points.append((10 + (y % 4), y))
    points.append((10, 50))
    points.append((210, 50))
    for y in range(50, 10, -5):
        points.append((210 - (y % 4), y))
    points.append((210, 10))
    
    draw.polygon(points, fill=color)
    tape_rot = tape.rotate(-8, resample=Image.Resampling.BICUBIC, expand=True)
    w_c, h_c = img.size
    w_t, h_t = tape_rot.size
    img.alpha_composite(tape_rot, ((w_c - w_t)//2, 10))

# ----------------- STYLE BUILDERS -----------------

def apply_style_1(photo_img, caption, date_label):
    """Style 1: Romantic Rose-Gold & Doodles"""
    # 1. Apply Rose-Gold photo filter
    img = photo_img.resize((700, 700), Image.Resampling.LANCZOS)
    img = img.filter(ImageFilter.GaussianBlur(radius=0.3))
    img = ImageEnhance.Contrast(img).enhance(1.1)
    img = ImageEnhance.Color(img).enhance(1.05)
    
    r, g, b = img.split()
    r = r.point(lambda p: min(255, int(p * 1.06)))
    g = g.point(lambda p: min(255, int(p * 0.98)))
    b = b.point(lambda p: int(p * 0.94))
    img = Image.merge("RGB", (r, g, b))
    
    # Soft film grain
    noise_tile = Image.new("L", (128, 128))
    noise_tile.putdata([int(random.gauss(128, 5)) for _ in range(128 * 128)])
    noise_tile_rgb = noise_tile.resize((700, 700), Image.Resampling.NEAREST).convert("RGB")
    img = Image.blend(img, noise_tile_rgb, 0.04)
    
    # 2. Assemble Card
    card = Image.new("RGBA", (800, 980), (255, 255, 255, 255))
    card.paste(img, (50, 50))
    
    draw = ImageDraw.Draw(card)
    draw.rectangle([0, 0, 799, 979], outline=(235, 220, 225, 255), width=2)
    
    # Border Doodles
    draw_heart(draw, 70, 780, 16, (240, 100, 130, 255))
    draw_sparkle(draw, 720, 760, 12, (255, 215, 0, 255))
    draw_sparkle(draw, 90, 900, 10, (255, 215, 0, 255))
    draw_heart(draw, 710, 890, 14, (240, 100, 130, 255))
    
    # Washi Tape
    draw_washi_tape(card, (255, 182, 193, 160))
    
    # Text (Segoe Print / Handwriting)
    try:
        f_caption = ImageFont.truetype(font_path_segoe, 38)
        f_date = ImageFont.truetype(font_path_segoe, 20)
    except:
        f_caption = f_date = ImageFont.load_default()
        
    cap_w = draw.textlength(caption, font=f_caption) if hasattr(draw, "textlength") else 200
    date_w = draw.textlength(date_label, font=f_date) if hasattr(draw, "textlength") else 100
    
    draw.text((400 - cap_w//2, 780), caption, fill=(80, 40, 50, 255), font=f_caption)
    draw.text((400 - date_w//2, 850), date_label, fill=(180, 140, 150, 255), font=f_date)
    
    return card.convert("RGB")

def apply_style_2(photo_img, caption, date_label, date_stamp):
    """Style 2: Retro Vintage Typewriter with Timestamp"""
    img = photo_img.resize((700, 700), Image.Resampling.LANCZOS)
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))
    img = ImageEnhance.Contrast(img).enhance(1.2)
    img = ImageEnhance.Brightness(img).enhance(1.03)
    img = ImageEnhance.Color(img).enhance(1.15)
    
    # CCD warm sensor tint
    r, g, b = img.split()
    r = r.point(lambda p: min(255, int(p * 1.05)))
    g = g.point(lambda p: min(255, int(p * 1.03)))
    b = b.point(lambda p: int(p * 0.90))
    img = Image.merge("RGB", (r, g, b))
    
    # Digital noise
    noise_tile = Image.new("L", (128, 128))
    noise_tile.putdata([int(random.gauss(128, 10)) for _ in range(128 * 128)])
    noise_tile_rgb = noise_tile.resize((700, 700), Image.Resampling.NEAREST).convert("RGB")
    img = Image.blend(img, noise_tile_rgb, 0.07)
    
    # LCD Timestamp stamp
    img = draw_datestamp(img, date_stamp)
    
    # Assemble Card
    card = Image.new("RGB", (800, 980), (250, 248, 245)) # aged paper
    card.paste(img, (50, 50))
    
    draw = ImageDraw.Draw(card)
    draw.rectangle([0, 0, 799, 979], outline=(215, 210, 200), width=1)
    
    # Courier Typewriter Font
    try:
        f_caption = ImageFont.truetype(font_path_courier, 34)
        f_date = ImageFont.truetype(font_path_courier, 18)
    except:
        f_caption = f_date = ImageFont.load_default()
        
    cap_w = draw.textlength(caption, font=f_caption) if hasattr(draw, "textlength") else 200
    date_w = draw.textlength(date_label, font=f_date) if hasattr(draw, "textlength") else 100
    
    draw.text((400 - cap_w//2, 780), caption, fill=(40, 40, 40), font=f_caption)
    draw.text((400 - date_w//2, 850), date_label, fill=(110, 110, 110), font=f_date)
    
    return card

def draw_smiley(draw, cx, cy, r, color=(255, 220, 0, 255)):
    # Yellow background circle
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color, outline=(0, 0, 0, 255), width=2)
    # Eyes
    eye_r = max(2, r // 6)
    draw.ellipse([cx - r//3 - eye_r, cy - r//3 - eye_r, cx - r//3 + eye_r, cy - r//3 + eye_r], fill=(0,0,0,255))
    draw.ellipse([cx + r//3 - eye_r, cy - r//3 - eye_r, cx + r//3 + eye_r, cy - r//3 + eye_r], fill=(0,0,0,255))
    # Smile
    draw.arc([cx - r//2, cy - r//2, cx + r//2, cy + r//3], 0, 180, fill=(0,0,0,255), width=3)

def apply_style_3(photo_img, caption, date_label):
    """Style 3: Cyberpunk Neon Stickers & Cyan Washi Tape"""
    img = photo_img.resize((700, 700), Image.Resampling.LANCZOS)
    img = ImageEnhance.Contrast(img).enhance(1.2)
    img = ImageEnhance.Color(img).enhance(1.4) # super vibrant
    
    # Shadow pink/blue tint
    r, g, b = img.split()
    r = r.point(lambda p: min(255, int(p * 1.12) if p < 120 else p))
    g = g.point(lambda p: int(p * 0.95))
    b = b.point(lambda p: min(255, int(p * 1.18) if p < 120 else p))
    img = Image.merge("RGB", (r, g, b))
    
    # Assemble Card (White frame)
    card = Image.new("RGBA", (800, 980), (255, 255, 255, 255))
    card.paste(img, (50, 50))
    
    draw = ImageDraw.Draw(card)
    draw.rectangle([0, 0, 799, 979], outline=(200, 240, 255, 255), width=2)
    
    # Cyan Washi Tape at the top (neon cyan)
    draw_washi_tape(card, (64, 192, 203, 180)) # neon cyan washi tape
    
    # Yellow smiley face sticker in bottom-right corner of the image
    draw_smiley(draw, 700, 700, 28)
    
    # Neon stars/sparkles in bottom-left and top areas
    draw_sparkle(draw, 80, 780, 14, (64, 224, 208, 255)) # cyan star
    draw_sparkle(draw, 720, 760, 10, (255, 20, 147, 255)) # neon pink star
    draw_sparkle(draw, 90, 900, 12, (255, 20, 147, 255)) # neon pink star
    draw_sparkle(draw, 710, 890, 15, (64, 224, 208, 255)) # cyan star
    
    # Text (Arial/Segoe Print) - styled in deep purple/black
    try:
        f_caption = ImageFont.truetype(font_path_arial, 36) if font_path_arial else ImageFont.load_default()
        f_date = ImageFont.truetype(font_path_arial, 18) if font_path_arial else ImageFont.load_default()
    except:
        f_caption = f_date = ImageFont.load_default()
        
    cap_w = draw.textlength(caption, font=f_caption) if hasattr(draw, "textlength") else 200
    date_w = draw.textlength(date_label, font=f_date) if hasattr(draw, "textlength") else 100
    
    draw.text((400 - cap_w//2, 780), caption, fill=(20, 10, 30, 255), font=f_caption)
    draw.text((400 - date_w//2, 850), date_label, fill=(100, 120, 140, 255), font=f_date)
    
    return card.convert("RGB")

def crop_center_square(img):
    w, h = img.size
    min_dim = min(w, h)
    if h > w:
        left = 0
        top = int((h - w) * 0.15)
        right = w
        bottom = top + w
    else:
        left = (w - min_dim) // 2
        top = (h - min_dim) // 2
        right = left + min_dim
        bottom = top + min_dim
    return img.crop((left, top, right, bottom))

# ----------------- MAIN PROCESSING -----------------

def get_human_date(date_str):
    parts = date_str.split("-")
    if len(parts) != 3:
        return date_str
    months = ["January", "February", "March", "April", "May", "June", 
              "July", "August", "September", "October", "November", "December"]
    try:
        year = int(parts[0])
        month = months[int(parts[1]) - 1]
        day = int(parts[2])
        return f"{month} {day}, {year}"
    except:
        return date_str

def get_date_stamp(date_str):
    parts = date_str.split("-")
    if len(parts) == 3:
        # MM.DD.YY
        return f"{parts[1]}.{parts[2]}.{parts[0][2:]}"
    return "06.01.26"

def run_generation():
    selections_file = os.path.join(src_folder, "selected_moments.json")
    if not os.path.exists(selections_file):
        print(f"Error: Selections file not found at {selections_file}")
        print("Please start serve_photos.py and approve/save selections first!")
        return

    with open(selections_file, "r", encoding="utf-8") as f:
        approved_photos = json.load(f)

    # Only process selected items
    approved_photos = [item for item in approved_photos if item.get("selected", False)]
    
    if not approved_photos:
        print("No approved photos to process in selected_moments.json!")
        return

    print(f"Generating final Instax Polaroids for {len(approved_photos)} selected photos...")
    
    for item in approved_photos:
        filename = item["filename"]
        path = os.path.join(src_folder, filename)
        if not os.path.exists(path):
            print(f"Skipping {filename} (does not exist)")
            continue
            
        img = Image.open(path)
        
        # 1. Apply Rotation
        rot_val = item.get("rotation", 0)
        if rot_val == 90:
            print(f"Rotating {filename} 90 deg CCW...")
            img = img.transpose(Image.Transpose.ROTATE_90)
        elif rot_val == 180:
            print(f"Rotating {filename} 180 deg...")
            img = img.transpose(Image.Transpose.ROTATE_180)
        elif rot_val == 270:
            print(f"Rotating {filename} 90 deg CW (270 CCW)...")
            img = img.transpose(Image.Transpose.ROTATE_270)
            
        w, h = img.size
        tags = item.get("tags", [])
        
        # 2. Crop & Layout
        # If it is a video call (Screenshot and no Hand Drawing/Chat/Bouquet tags)
        is_video_call = filename.startswith("Screenshot_") and not any(t in tags for t in ["Hand Drawing", "Adorable Chat", "Bouquet"])
        is_drawing_or_chat = any(t in tags for t in ["Hand Drawing", "Adorable Chat", "Bouquet"])
        
        if is_video_call:
            print(f"Cropping and stitching video call for {filename}...")
            # Crop call PIP window (Saket) and background (Grishma) and merge side-by-side
            saket_face = img.crop((int(w * 0.63), int(h * 0.12), int(w * 0.95), int(h * 0.31))).resize((400, 400), Image.Resampling.LANCZOS)
            grishma_face = img.crop((int(w * 0.15), int(h * 0.38), int(w * 0.85), int(h * 0.73))).resize((400, 400), Image.Resampling.LANCZOS)
            
            merged = Image.new("RGB", (800, 400))
            merged.paste(grishma_face, (0, 0))
            merged.paste(saket_face, (400, 0))
            
            # Letterbox stitched 800x400 into 700x700
            merged.thumbnail((700, 700), Image.Resampling.LANCZOS)
            bg = Image.new("RGB", (700, 700), (255, 248, 249))
            offset = ((700 - merged.width) // 2, (700 - merged.height) // 2)
            bg.paste(merged, offset)
            photo_final = bg
        elif is_drawing_or_chat:
            print(f"Fitting drawing/chat aspect ratio for {filename}...")
            # Letterbox image to prevent clipping the sketch or text bubble
            img.thumbnail((700, 700), Image.Resampling.LANCZOS)
            bg = Image.new("RGB", (700, 700), (255, 248, 249))
            offset = ((700 - img.width) // 2, (700 - img.height) // 2)
            bg.paste(img, offset)
            photo_final = bg
        else:
            print(f"Applying center-square crop for {filename}...")
            # Regular camera photos
            photo_final = crop_center_square(img).resize((700, 700), Image.Resampling.LANCZOS)
            
        # 3. Apply Style
        style_mode = item.get("style_mode", 1)
        caption = item.get("caption", "Our Memory")
        if not caption:
            caption = "Our Memory"
        # Strip emojis (including BMP dingbats/symbols and non-BMP characters) to prevent empty box characters
        import re
        caption = re.sub(r'[\u2000-\u32ff\ud800-\udbff\udf00-\udfff\ufe0f]', '', caption)
        caption = "".join(c for c in caption if ord(c) < 0x10000).strip()
        date_val = item.get("custom_date", "2026-06-01")
        date_label = get_human_date(date_val)
        date_stamp = get_date_stamp(date_val)
        
        print(f"Applying Style {style_mode} to {filename}...")
        if style_mode == 1:
            polaroid_card = apply_style_1(photo_final, caption, date_label)
        elif style_mode == 2:
            polaroid_card = apply_style_2(photo_final, caption, date_label, date_stamp)
        else:
            polaroid_card = apply_style_3(photo_final, caption, date_label)
            
        # 4. Save (prefixed with instax_ to match Supabase expectations)
        out_name = f"instax_{filename}"
        polaroid_card.save(os.path.join(out_folder, out_name), "JPEG")
        print(f"Saved: {out_name}")
        
    print(f"\nFinal Polaroid generation complete! Check {out_folder}")

if __name__ == "__main__":
    run_generation()
