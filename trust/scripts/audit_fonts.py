import os
import re
import urllib.request
import subprocess

os.makedirs("fonts", exist_ok=True)
os.makedirs("parity/font_audit", exist_ok=True)

# We use an old Safari User-Agent so Google Fonts serves .ttf instead of .woff2
USER_AGENT = "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.54.16 (KHTML, like Gecko) Version/5.1.4 Safari/534.54.16"

fonts = ["Inter", "Montserrat", "Poppins"]
weights = [300, 400, 500, 600, 700, 800, 900]

def get_font_css(font_name):
    url = f"https://fonts.googleapis.com/css2?family={font_name}:wght@300;400;500;600;700;800;900&display=swap"
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req) as response:
        return response.read().decode('utf-8')

for font in fonts:
    css = get_font_css(font)
    # Parse CSS to find font URLs for each weight
    for w in weights:
        # Match pattern like: font-weight: 400; ... src: url(http://...)
        pattern = f"font-weight:\s*{w};.*?src:\s*url\((https://[^)]+)\)"
        match = re.search(pattern, css, re.DOTALL | re.IGNORECASE)
        if match:
            ttf_url = match.group(1)
            ttf_path = f"fonts/{font}-{w}.ttf"
            if not os.path.exists(ttf_path):
                print(f"Downloading {font} {w}...")
                urllib.request.urlretrieve(ttf_url, ttf_path)

def generate_ass(font_name, weight, output_path):
    ass_content = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},200,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,{weight},0,0,0,100,100,0,0,1,0,0,5,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0,0,0,,{font_name} {weight}
"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(ass_content)

for font in fonts:
    for weight in weights:
        ass_path = f"parity/font_audit/{font}_{weight}.ass"
        img_path = f"parity/font_audit/{font}_{weight}.png"
        
        generate_ass(font, weight, ass_path)
        
        fonts_dir_abs = os.path.abspath("fonts").replace("\\", "/")
        cmd = [
            "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=black:s=1920x1080",
            "-vf", f"subtitles={ass_path}:fontsdir='{fonts_dir_abs}'",
            "-frames:v", "1", img_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Rendered {font} {weight}")

print("Font audit rendering complete.")
