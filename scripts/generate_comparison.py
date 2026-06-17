import os
import json
import subprocess

with open('parity_test_payloads.json', 'r', encoding='utf-8') as f:
    payloads = json.load(f)

for p in payloads:
    raw_id = p['project_id']
    preview = f"{raw_id}_preview.png"
    export = f"{raw_id}_frame.png"
    out = f"{raw_id}_comparison.png"
    
    if not os.path.exists(preview):
        print(f"Missing {preview}")
        continue
    if not os.path.exists(export):
        print(f"Missing {export}")
        continue
        
    # ffmpeg command to scale preview to 1080x1920, then stack side-by-side
    # We add a 4px white border between them for clarity
    cmd = [
        "ffmpeg", "-y",
        "-i", preview,
        "-i", export,
        "-filter_complex", 
        "[0:v]scale=1080:1920[v0];[v0]pad=1084:1920:0:0:white[v0pad];[v0pad][1:v]hstack=inputs=2",
        out
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"Successfully generated {out}")
    except subprocess.CalledProcessError as e:
        print(f"Failed to generate {out}: {e.stderr.decode()}")
