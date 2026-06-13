import os
import subprocess
from PIL import Image

blank_path = "blank4.png"
img = Image.new('RGB', (720, 1280), color=(255, 255, 255))
img.save(blank_path)

ass_content = """[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Inter,56,&H00FFFFFF,&H000000FF,&H40000000,&H40000000,-1,0,0,0,100,100,0,0,3,18,0,8,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:10.00,Default,,0,0,0,,{\\pos(360,100)}పాపం{\\fsp15} {\\fsp0}బేసిక్కా{\\fsp15} {\\fsp0}బేసిక్కా
Dialogue: 0,0:00:00.00,0:00:10.00,Default,,0,0,0,,{\\pos(360,180)}బేసిక్కా{\\fsp15} {\\fsp0}బాగి{\\fsp15} {\\fsp0}పాపం
Dialogue: 0,0:00:00.00,0:00:10.00,Default,,0,0,0,,{\\pos(360,260)}చేస్కున్నా{\\fsp15} {\\fsp0}అనుకునాడు
"""
ass_path = "test_sub4.ass"
with open(ass_path, "w", encoding="utf-8") as f:
    f.write(ass_content)

out_path = "rendered4.png"
subprocess.run([
    "ffmpeg", "-y", "-i", blank_path,
    "-vf", f"ass={ass_path}",
    out_path
], capture_output=True)

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
    print(f"Target Height is 160 + font size padding = ~220px")
else:
    print("No subtitle found.")
