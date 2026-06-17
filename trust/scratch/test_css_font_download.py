import urllib.request
import urllib.parse
import os
import re
import shutil

def download_google_font(font_name: str) -> str:
    font_dir = "./scratch_fonts"
    os.makedirs(font_dir, exist_ok=True)
    
    safe_name = font_name.replace(" ", "")
    
    print(f"Downloading {font_name} via Google Fonts CSS parser...")
    try:
        # Use Safari user agent to force Google Fonts to return .ttf urls
        user_agent = "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.54.16 (KHTML, like Gecko) Version/5.1.4 Safari/534.54.16"
        url = f"https://fonts.googleapis.com/css2?family={urllib.parse.quote(font_name)}:wght@300;400;500;600;700;800;900&display=swap"
        
        req = urllib.request.Request(url, headers={'User-Agent': user_agent})
        with urllib.request.urlopen(req) as response:
            css = response.read().decode('utf-8')
            
        weights = [300, 400, 500, 600, 700, 800, 900]
        downloaded = 0
        for w in weights:
            # Match font-weight and src URL
            pattern = f"font-weight:\s*{w};.*?src:\s*url\((https://[^)]+)\)"
            match = re.search(pattern, css, re.DOTALL | re.IGNORECASE)
            if match:
                ttf_url = match.group(1)
                ttf_path = os.path.join(font_dir, f"{safe_name}-{w}.ttf")
                print(f"Found weight {w} url: {ttf_url}")
                urllib.request.urlretrieve(ttf_url, ttf_path)
                downloaded += 1
                
        if downloaded > 0:
            print(f"Successfully downloaded {downloaded} weights for font {font_name}")
            regular_path = os.path.join(font_dir, f"{safe_name}-400.ttf")
            generic_path = os.path.join(font_dir, f"{safe_name}.ttf")
            if os.path.exists(regular_path):
                shutil.copy(regular_path, generic_path)
            return font_dir
            
    except Exception as e:
        print(f"Failed to download font {font_name} via CSS parser: {e}")
        
    return font_dir

download_google_font("Montserrat")
print("Files in scratch_fonts:")
print(os.listdir("./scratch_fonts"))
