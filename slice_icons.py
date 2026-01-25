from PIL import Image
import os

# Source image
source_path = "/home/toni/.gemini/antigravity/brain/4072b705-820f-42e3-8c5a-94ada798905e/uploaded_media_1769380386635.png"
output_dir = "public"

# Grid configuration (based on visual inspection of the grid being 4 cols x 2 rows)
rows = 2
cols = 4

# Icon names in order (Top-Left to Bottom-Right)
icon_names = [
    "executor.png", "client.png", "rocket.png", "skull.png",
    "clock.png", "scales.png", "letter.png", "lock.png"
]

def slice_grid():
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    img = Image.open(source_path)
    width, height = img.size
    
    # Calculate cell size
    cell_width = width // cols
    cell_height = height // rows
    
    print(f"Image size: {width}x{height}")
    print(f"Cell size: {cell_width}x{cell_height}")

    for i, name in enumerate(icon_names):
        row = i // cols
        col = i % cols
        
        left = col * cell_width
        top = row * cell_height
        right = left + cell_width
        bottom = top + cell_height
        
        # Crop
        icon = img.crop((left, top, right, bottom))
        
        # Optional: Crop center to remove labels text if needed, 
        # but for now we take the full cell. The user's image has text below icons.
        # Let's crop slightly in from bottom to avoid the text label if possible?
        # Visual check: Text is at the very bottom. Let's crop bottom 15% off.
        # icon = icon.crop((0, 0, cell_width, int(cell_height * 0.85))) 
        
        # Saving
        save_path = os.path.join(output_dir, name)
        icon.save(save_path)
        print(f"Saved {name}")

if __name__ == "__main__":
    slice_grid()
