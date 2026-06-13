import os
import subprocess
from PIL import Image

# 1. Create a blank 720x1280 image
blank_path = "blank3.png"
img = Image.new('RGB', (720, 1280), color=(255, 255, 255))
img.save(blank_path)

# 2. ASS Content
# We test {\fsp} for word spacing, and {\fs} for line spacing
ass_content = """[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 1
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Inter,56,&H00FFFFFF,&H000000FF,&H40000000,&H40000000,-1,0,0,0,100,100,0,0,3,18,0,2,54,54,127,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:10.00,Default,,0,0,0,,పాపం{\\fsp15} {\\fsp0}బేసిక్కా{\\fsp15} {\\fsp0}బేసిక్కా{\\fs100}\\N{\\fs56}బేసిక్కా{\\fsp15} {\\fsp0}బాగి{\\fsp15} {\\fsp0}పాపం{\\fs100}\\N{\\fs56}చేస్కున్నా{\\fsp15} {\\fsp0}అనుకునాడు
"""
ass_path = "test_sub3.ass"
with open(ass_path, "w", encoding="utf-8") as f:
    f.write(ass_content)

# 3. Render with ffmpeg
out_path = "rendered3.png"
subprocess.run([
    "ffmpeg", "-y", "-i", blank_path,
    "-vf", f"ass={ass_path}",
    out_path
], capture_output=True)

# 4. Measure the rendered box
rendered = Image.open(out_path).convert('RGB')
pixels = rendered.load()

min_x, max_x = 720, 0
min_y, max_y = 1280, 0

for y in range(1280):
    for x in range(720):
        if pixels[x, y] != (255, 255, 255):
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

if max_x >= min_x and max_y >= min_y:
    box_w = max_x - min_x + 1
    box_h = max_y - min_y + 1
    print(f"Rendered ASS Box Dimensions: {box_w} x {box_h} px")
    print(f"Target CSS Dimensions: 360 x 252 px (for this exact wrap)")
else:
    print("No subtitle found.")
