import os
import glob
from rembg import remove, new_session
from PIL import Image

def process_images(directory):
    files = glob.glob(os.path.join(directory, '*.png'))
    print(f"Found {len(files)} images in {directory}")
    # Use the lightweight u2netp model (only 4MB) for instant download and processing
    session = new_session("u2netp")
    for file in files:
        print(f"Processing {file}...")
        input_image = Image.open(file)
        # Remove background
        output_image = remove(input_image, session=session)
        # Save back to same file
        output_image.save(file)
        print(f"Saved {file}")

if __name__ == "__main__":
    process_images(r"d:\Notepad Project\For_basundi\public\assets\flowers")
