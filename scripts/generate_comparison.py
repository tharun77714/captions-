import os
import json
import subprocess

with open('parity_test_payloads.json', 'r', encoding='utf-8') as f:
    payloads = json.load(f)

for p in payloads:
    raw_id = p['project_id']
    frame_path = f"{raw_id}_frame.png"
    
    if not os.path.exists(frame_path):
        print(f"Missing {frame_path}")
        continue
        
    # Extract common prefix
    prefix = frame_path.replace("_frame.png", "")
    preview_path = f"{prefix}_preview.png"
    out_path = f"{prefix}_comparison.png"
    
    if not os.path.exists(preview_path):
        print(f"Missing {preview_path}")
        continue
    
    # Use ffmpeg to stack them side by side
    # We'll scale the preview to match the frame height just in case
    cmd = [
        "ffmpeg", "-y",
        "-i", preview_path,
        "-i", frame_path,
        "-filter_complex", "[0:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2[l];[1:v]scale=720:1280[r];[l][r]hstack",
        out_path
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"Successfully generated {out_path}")
    except subprocess.CalledProcessError as e:
        print(f"Failed to generate {out}: {e.stderr.decode()}")
