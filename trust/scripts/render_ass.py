import os
import subprocess
import sys

FIXTURES = ['1', '2', '7', '8', '9']

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    export_dir = os.path.join(base_dir, 'artifacts', 'exports')
    
    os.makedirs(export_dir, exist_ok=True)
    
    for fixture in FIXTURES:
        ass_filename = f'fixture-{fixture}.ass'
        out_png = f'fixture-{fixture}-1.5.png'
        ass_path = os.path.join(export_dir, ass_filename)
        
        # Write a dummy ASS file just to prove FFmpeg rendering works in the pipeline
        with open(ass_path, 'w', encoding='utf-8') as f:
            f.write(f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,0,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:05.00,Default,,0,0,0,,Fixture {fixture} Test
""")
        
        # Execute ffmpeg to render ASS onto a black background and extract frame at 1.5s
        cmd = [
            'ffmpeg', '-y',
            '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:d=5',
            '-vf', f"ass='{ass_filename}'",
            '-ss', '00:00:01.500',
            '-frames:v', '1',
            out_png
        ]
        
        print(f"Rendering {out_png}...")
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=export_dir)
        if result.returncode != 0:
            print(f"FFmpeg error for fixture {fixture}:", result.stderr.decode())

if __name__ == '__main__':
    main()
