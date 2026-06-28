# 📸 Instax Polaroid Generator — Documentation

This documentation explains how the Instax Polaroid Generator scripts process, rotate, and style your couple selfies and video call screenshots, and how to publish them to your digital scrapbook album.

---

## 🛠️ Key Features

### 1. 🔄 Automatic Left Rotation (90° CCW)
Phone camera sensors often save selfies in landscape orientation (sideways) rather than portrait. The generator automatically detects these files and transposes them **90 degrees counter-clockwise (to the left)** before cropping, rendering them perfectly upright.
*   **Rotated Files**: `Snapchat-922464268.jpg` and `Snapchat-1500244527.jpg` are corrected programmatically.
*   **Upright Files**: Video call screenshots are captured in portrait orientation and bypass this rotation.

### 👥 2. Video Call Side-by-Side Stitching
To transform long-distance call screenshots into cute couple photos, the script:
*   Crops **Grishma's face** from the center-left area of the main window.
*   Crops **Saket's face** from the top-right Picture-in-Picture (PIP) window.
*   Stitches them side-by-side into a single 800x400 image, creating a unified couple photo.

### 🎨 3. Design Aesthetics
The script generates three distinct styles (Style 1 is active by default):
*   **Style 1 (Romantic Rose-Gold)**: Applies a dreamy peach/rose tint, adds hand-drawn sparkle/heart doodles, applies a pastel pink washi tape sticker, and draws a handwriting font label.
*   **Style 2 (Retro Typewriter)**: Applies a direct camera flash exposure, high sensor noise, a classic orange digital timestamp on the image, and a Courier typewriter font.
*   **Style 3 (Cyberpunk Stickers)**: Applies high saturation, blue/pink shadow tints, a yellow smiley face sticker, neon stars, and cyan washi tape.

---

## 🚀 How to Run the Generator

### Prerequisites
Make sure you have `Pillow` (PIL) installed:
```bash
pip install Pillow
```

### Run Generation
Run the python script inside the `collage photos` directory:
```bash
python generate_final_prints.py
```
This processes the 4 approved photos and saves the final JPEGs inside the new [final_instax_prints/](file:///d:/Notepad%20Project/For_basundi/collage%20photos/final_instax_prints) directory.

To toggle between styles, edit [generate_final_prints.py](file:///d:/Notepad%20Project/For_basundi/collage%20photos/generate_final_prints.py) on line 258:
*   `run_generation(style_mode=1)` for Rose-Gold & Doodles.
*   `run_generation(style_mode=2)` for Retro Typewriter & Timestamp.

---

## ☁️ Uploading to your Live Scrapbook

Once you are happy with the generated photos, you can push them live to your Supabase album database so they appear on the website!

Run the local Node.js script:
```bash
node upload_to_supabase.js
```
This script reads the API keys in your `.env.local` file, uploads the processed images to your Supabase Storage bucket (`album-photos`), and inserts the records into the database table (`album_photos`).
