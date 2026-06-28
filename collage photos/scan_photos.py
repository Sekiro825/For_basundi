import os
import json
import re
from PIL import Image

src_folder = os.path.dirname(os.path.abspath(__file__))
output_file = os.path.join(src_folder, "photo_metadata.json")

# Regex patterns to parse dates
screenshot_pattern = re.compile(r"Screenshot_(\d{4})-(\d{2})-(\d{2})")
whatsapp_pattern = re.compile(r"IMG-(\d{4})(\d{2})(\d{2})")
img_alt_pattern = re.compile(r"IMG(\d{4})(\d{2})(\d{2})")

def get_image_info(filename):
    filepath = os.path.join(src_folder, filename)
    info = {
        "filename": filename,
        "size_kb": os.path.getsize(filepath) // 1024,
        "width": 0,
        "height": 0,
        "date": "Unknown Date",
        "category": "other"
    }
    
    # Parse Date
    m = screenshot_pattern.search(filename)
    if m:
        year, month, day = m.groups()
        info["date"] = f"{year}-{month}-{day}"
    else:
        m = whatsapp_pattern.search(filename)
        if m:
            year, month, day = m.groups()
            info["date"] = f"{year}-{month}-{day}"
        else:
            m = img_alt_pattern.search(filename)
            if m:
                year, month, day = m.groups()
                info["date"] = f"{year}-{month}-{day}"
    
    # Categories
    if filename.startswith("Screenshot_"):
        info["category"] = "screenshot"
    elif filename.startswith("Snapchat-"):
        info["category"] = "snapchat"
    elif filename.startswith("IMG-") or filename.startswith("IMG"):
        info["category"] = "whatsapp_or_camera"
    elif filename.startswith("Record_"):
        info["category"] = "video"
        
    # Get image dimensions (except for videos)
    if not filename.endswith(".mp4"):
        try:
            with Image.open(filepath) as img:
                info["width"], info["height"] = img.size
        except Exception as e:
            info["error"] = str(e)
            
    return info

def main():
    items = []
    for f in os.listdir(src_folder):
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.mp4')):
            items.append(get_image_info(f))
            
    # Sort items by date/filename
    items.sort(key=lambda x: (x.get("date", ""), x["filename"]))
    
    with open(output_file, "w", encoding="utf-8") as out:
        json.dump(items, out, indent=2)
        
    print(f"Scanned {len(items)} files and wrote metadata to {output_file}")

if __name__ == "__main__":
    main()
