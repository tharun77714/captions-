import cv2
import numpy as np

def analyze_image(path, name):
    img = cv2.imread(path)
    if img is None:
        print(f"Could not load {path}")
        return
        
    print(f"\n--- {name} ---")
    h, w = img.shape[:2]
    print(f"Image Resolution: {w}x{h}")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # We want to find the video frame.
    # The background is usually very dark, while the video has content.
    # But it's easier to find the subtitle box first!
    # The subtitle box has a black/dark semi-transparent background with white text.
    # Let's search for the white text.
    # Threshold for bright white text
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
    
    # Find contours of white pixels
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    text_contours = []
    for c in contours:
        x, y, cw, ch = cv2.boundingRect(c)
        # Filter small noise and very large things
        if 5 < cw < 1000 and 5 < ch < 100:
            # Check if it's in the lower half of the screen
            if y > h // 2:
                text_contours.append(c)
                
    if not text_contours:
        print("No text found.")
        return
        
    # Bounding box of all text
    min_x = min(cv2.boundingRect(c)[0] for c in text_contours)
    min_y = min(cv2.boundingRect(c)[1] for c in text_contours)
    max_x = max(cv2.boundingRect(c)[0] + cv2.boundingRect(c)[2] for c in text_contours)
    max_y = max(cv2.boundingRect(c)[1] + cv2.boundingRect(c)[3] for c in text_contours)
    
    text_w = max_x - min_x
    text_h = max_y - min_y
    
    print(f"Text Bounding Box: {text_w}x{text_h} px")
    print(f"Text Pos: X={min_x}, Y={min_y}")
    
    # Now try to find the subtitle background box
    # It's a dark rectangle surrounding the text.
    # Let's look at the area around the text box
    # Crop a region
    pad = 50
    crop_y1 = max(0, min_y - pad)
    crop_y2 = min(h, max_y + pad)
    crop_x1 = max(0, min_x - pad)
    crop_x2 = min(w, max_x + pad)
    
    # We can't easily find the semi-transparent box automatically without more heuristics.
    # But text height is the most important!
    
analyze_image("tests/images/export.png", "Export (Media Player)")
analyze_image("tests/images/editor.png", "Editor (Browser)")
