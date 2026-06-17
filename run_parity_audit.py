import json
import os
import subprocess
from export_test import generate_ass, download_google_font

with open('parity_test_payloads.json', 'r', encoding='utf-8') as f:
    payloads = json.load(f)

for p in payloads:
    pid = p['project_id']
    style = p['style']
    segments = p['segments']
    measurements = p['measurements']
    
    # Simulate new video-player.tsx behavior: pre-scale coordinates
    if measurements and 'layouts' in measurements:
        scale = measurements.get('scaleFactor', 1.0)
        for layout in measurements['layouts']:
            if 'box' in layout:
                layout['box']['x'] *= scale
                layout['box']['y'] *= scale
                layout['box']['w'] *= scale
                layout['box']['h'] *= scale
            for w in layout.get('words', []):
                w['x'] *= scale
                w['y'] *= scale
                w['w'] *= scale
                w['h'] *= scale
    
    local_subs_path = f"{pid}.ass"
    out_frame = f"{pid}_frame.png"
    
    font_name = measurements.get('fontFamily') or style.get('fontFamily', 'Inter')
    
    try:
        font_dir = download_google_font(font_name)
    except Exception as e:
        print(f"Font download failed for {font_name}, fallback to system fonts.")
        font_dir = None
        
    generate_ass(segments, style, local_subs_path, 1080, 1920, measurements)
    
    ass_path_escaped = local_subs_path.replace("\\", "\\\\").replace(":", "\\:")
    
    cmd = [
        "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=black:s=1080x1920",
        "-ss", "00:00:01.000"
    ]
    
    filter_cmd = f"ass='{ass_path_escaped}'"
    if font_dir:
        font_dir_escaped = font_dir.replace("\\", "/")
        filter_cmd += f":fontsdir={font_dir_escaped}"
        
    cmd.extend(["-vf", filter_cmd, "-frames:v", "1", out_frame])
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"Successfully generated {out_frame}")
    except subprocess.CalledProcessError as e:
        print(f"Failed to generate {out_frame}: {e.stderr.decode()}")
