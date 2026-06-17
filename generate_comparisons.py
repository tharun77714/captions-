from PIL import Image
import glob
import os

scenarios = [
    '1_telugu', '2_tamil', '3_english', '4_hindi', '5_translation',
    '6_karaoke', '7_long_captions', '8_short_captions', '9_multi_line', '10_extreme_styling'
]

brain_dir = r"C:\Users\Kotha\.gemini\antigravity\brain\1b80c15b-4e2e-4f58-96ad-21735aaefde4"

for s in scenarios:
    preview_path = f"{s}_preview.png"
    export_path = f"{s}_frame.png"
    out_path = os.path.join(brain_dir, f"{s}_comparison.png")
    
    if os.path.exists(preview_path) and os.path.exists(export_path):
        preview_img = Image.open(preview_path)
        export_img = Image.open(export_path)
        
        # We need to resize export_img to match preview_img height, or vice versa, to display side by side
        # Preview is 362x644, Export is 1080x1920
        # Let's resize preview up to 1080x1920 since export is native resolution
        target_h = export_img.height
        target_w = int(preview_img.width * (target_h / preview_img.height))
        
        preview_resized = preview_img.resize((target_w, target_h), Image.LANCZOS)
        
        total_w = target_w + export_img.width
        combo = Image.new('RGB', (total_w, target_h))
        combo.paste(preview_resized, (0, 0))
        combo.paste(export_img, (target_w, 0))
        combo.save(out_path)
        print(f"Generated {out_path}")
    else:
        print(f"Missing images for {s}")
