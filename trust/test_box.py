import os
ass = """[Script Info]
PlayResX: 1280
PlayResY: 720
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0,0,0,,{\\pos(100,100)\\1c&H0000FF&\\3c&H0000FF&\\bord20\\p1}m 0 0 l 200 0 l 200 100 l 0 100{\\p0}
Dialogue: 1,0:00:00.00,0:00:05.00,Default,,0,0,0,,{\\pos(150,120)}Test
"""
with open('test_box.ass', 'w') as f: f.write(ass)
os.system('ffmpeg -y -f lavfi -i color=c=white:s=1280x720:d=1 -vf "ass=test_box.ass" test_box.png')
