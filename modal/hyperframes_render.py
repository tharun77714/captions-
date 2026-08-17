import os
import modal
import subprocess
import time
import uuid
import json
import boto3
from supabase import create_client

# Define high-performance Linux container image with Node 22, FFmpeg, Chromium, and HyperFrames
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "curl", "git", "ca-certificates")
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
        "apt-get install -y nodejs",
        "npx --yes playwright install-deps chromium",
        "npm install -g hyperframes@0.7.109 gsap"
    )
    .pip_install(
        "boto3==1.34.101",
        "supabase",
        "requests",
        "fastapi[standard]",
        "pydantic"
    )
)

app = modal.App(name="vidyut-hyperframes", image=image)

def get_s3_client():
    account_id = os.environ.get("R2_ACCOUNT_ID")
    access_key = os.environ.get("R2_ACCESS_KEY_ID")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
    endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
    )

def get_supabase_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def generate_composition_html(
    comp_id: str,
    width: int,
    height: int,
    duration_seconds: float,
    words: list,
    hero_word_ids: list,
    video_src: str,
    matte_src: str = None,
    plate_src: str = None,
    style: str = "3D_CLIMAX"
) -> str:
    words_json = json.dumps(words)
    hero_json = json.dumps(hero_word_ids)
    has_matte = bool(matte_src and plate_src)

    safe_width = int(width * 0.88)
    safe_left = int(width * 0.06)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{comp_id}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Noto+Sans+Telugu:wght@400;700;900&family=Noto+Serif+Telugu:wght@700;900&display=swap" rel="stylesheet">
  <style>
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}

    body, html {{
      width: {width}px;
      height: {height}px;
      overflow: hidden;
      background: #000;
      font-family: 'Noto Sans Telugu', 'Inter', sans-serif;
    }}

    #root {{
      position: relative;
      width: {width}px;
      height: {height}px;
    }}

    .bg-video {{
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 1;
    }}

    /* Layer 2: Hero Climax Stage (Behind Subject) */
    .hero-climax-stage {{
      position: absolute;
      top: 20%;
      left: {safe_left}px;
      width: {safe_width}px;
      height: 38%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      z-index: 2;
      pointer-events: none;
      padding: 10px;
    }}

    .hero-word {{
      font-family: 'Noto Serif Telugu', 'Inter', serif;
      font-size: 88px;
      font-weight: 900;
      line-height: 1.15;
      color: #FACC15;
      text-transform: none;
      opacity: 0;
      transform: scale(0.92) translateY(16px);
      text-shadow: 0 10px 40px rgba(0, 0, 0, 0.95), 0 0 60px rgba(250, 204, 21, 0.5);
      hyphens: none;
      -webkit-hyphens: none;
      word-break: keep-all;
      overflow-wrap: break-word;
      max-width: 100%;
    }}

    .plate-video {{
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 3;
      pointer-events: none;
    }}

    .subject-video {{
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 4;
      pointer-events: none;
    }}

    /* Layer 5: Safe Lower Rail */
    .caption-rail {{
      position: absolute;
      bottom: 10%;
      left: {safe_left}px;
      width: {safe_width}px;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 12px 18px;
      padding: 14px 20px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(12px);
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }}

    .word {{
      display: inline-block;
      font-size: 42px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.55);
      text-transform: none;
      hyphens: none;
      -webkit-hyphens: none;
      word-break: keep-all;
    }}
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body>
  <div id="root" data-composition-id="{comp_id}" data-width="{width}" data-height="{height}" data-start="0" data-duration="{duration_seconds}">
    <!-- Layer 1: Background -->
    <video id="bg-video-layer" class="bg-video clip" src="{video_src}" data-start="0" data-duration="{duration_seconds}" playsinline muted></video>

    <!-- Layer 2: Hero Climax Text (Behind Person) -->
    <div id="hero-stage" class="hero-climax-stage clip" data-start="0" data-duration="{duration_seconds}"></div>

    {"<!-- Layer 3 & 4: Person Matte Separation -->" if has_matte else ""}
    {f'<video id="plate-video-layer" class="plate-video clip" src="{plate_src}" data-start="0" data-duration="{duration_seconds}" playsinline muted></video>' if has_matte else ""}
    {f'<video id="subject-video-layer" class="subject-video clip" src="{matte_src}" data-start="0" data-duration="{duration_seconds}" playsinline muted></video>' if has_matte else ""}

    <!-- Layer 5: Standard Lower Third Rail -->
    <div id="caption-rail" class="caption-rail clip" data-start="0" data-duration="{duration_seconds}"></div>
  </div>

  <script>
    (async function() {{
      await document.fonts.ready;

      const WORDS = {words_json};
      const HERO_WORD_IDS = new Set({hero_json});
      const heroStage = document.getElementById('hero-stage');
      const rail = document.getElementById('caption-rail');
      const safeWidth = {safe_width};

      WORDS.forEach((w) => {{
        if (HERO_WORD_IDS.has(w.id)) {{
          const heroEl = document.createElement('div');
          heroEl.id = 'hero_' + w.id;
          heroEl.className = 'hero-word';
          heroEl.textContent = w.text;
          heroStage.appendChild(heroEl);

          let currentSize = 92;
          if (w.text.length > 12) {{
            currentSize = Math.max(48, Math.floor(currentSize * 0.72));
          }} else if (w.text.length > 8) {{
            currentSize = Math.max(54, Math.floor(currentSize * 0.82));
          }}
          heroEl.style.fontSize = currentSize + 'px';
        }}

        const railEl = document.createElement('span');
        railEl.id = 'rail_' + w.id;
        railEl.className = 'word';
        railEl.textContent = w.text;
        rail.appendChild(railEl);
      }});

      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});

      WORDS.forEach((w) => {{
        if (HERO_WORD_IDS.has(w.id)) {{
          const heroEl = document.getElementById('hero_' + w.id);
          if (heroEl) {{
            tl.set(heroEl, {{ opacity: 1, scale: 1.0, y: 0, color: '#FACC15' }}, w.start);
            tl.set(heroEl, {{ opacity: 0, scale: 0.92, y: 16 }}, w.end);
          }}
        }}

        const railEl = document.getElementById('rail_' + w.id);
        if (railEl) {{
          tl.set(railEl, {{ color: '#FFFFFF', opacity: 1, scale: 1.05 }}, w.start);
          tl.set(railEl, {{ color: 'rgba(255, 255, 255, 0.55)', opacity: 0.55, scale: 1.0 }}, w.end);
        }}
      }});

      tl.to({{}}, {{ duration: {duration_seconds} }}, 0);
      window.__timelines["{comp_id}"] = tl;
      window.__captionReady = true;
    }})();
  </script>
</body>
</html>"""

@app.function(
    gpu="T4",
    cpu=4.0,
    memory=8192,
    timeout=600,
    secrets=[modal.Secret.from_name("vidyut-secrets")]
)
def process_hyperframes_render(
    project_id: str,
    user_id: str,
    style_name: str = "3D_CLIMAX",
    aspect_ratio: str = "9:16",
    hero_word_ids: list = None
):
    start_time = time.time()
    work_dir = f"/tmp/hf_{project_id}_{int(time.time())}"
    os.makedirs(work_dir, exist_ok=True)

    supabase = get_supabase_client()
    s3 = get_s3_client()
    bucket_name = os.environ.get("R2_BUCKET_NAME", "vidyut-media")

    try:
        print(f"🎬 [HyperFrames] Starting render for project {project_id} (Style: {style_name})")

        # 1. Fetch project and transcription from Supabase
        project_res = supabase.table("projects").select("*").eq("id", project_id).single().execute()
        if not project_res.data:
            raise RuntimeError(f"Project {project_id} not found")
        project = project_res.data

        trans_res = supabase.table("transcriptions").select("*").eq("project_id", project_id).single().execute()
        if not trans_res.data:
            raise RuntimeError(f"Transcription for {project_id} not found")
        transcription = trans_res.data

        # Update status to rendering
        supabase.table("projects").update({"export_status": "rendering"}).eq("id", project_id).execute()

        # 2. Download source video
        media_url = project.get("media_url", "")
        local_video = os.path.join(work_dir, "input.mp4")
        
        if media_url and not media_url.startswith("http"):
            print(f"⬇️ Downloading video from R2 direct key: {media_url}")
            s3.download_file(bucket_name, media_url, local_video)
        elif ".com/" in media_url:
            s3_key = media_url.split(".com/")[-1]
            print(f"⬇️ Downloading video from R2 key: {s3_key}")
            s3.download_file(bucket_name, s3_key, local_video)
        else:
            import requests
            print(f"⬇️ Downloading video from URL: {media_url}")
            r = requests.get(media_url, stream=True)
            with open(local_video, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)

        # 3. Format transcript words
        words = []
        raw_words = transcription.get("words")
        if not raw_words or not isinstance(raw_words, list) or len(raw_words) == 0:
            # Extract from segments
            raw_segments = transcription.get("segments", [])
            for seg in raw_segments:
                for w in seg.get("words", []):
                    words.append({
                        "id": str(w.get("id", f"word-{len(words)}")),
                        "text": (w.get("word") or w.get("text") or "").strip(),
                        "start": float(w.get("start", 0)),
                        "end": float(w.get("end", 0))
                    })
        else:
            for i, w in enumerate(raw_words):
                words.append({
                    "id": str(w.get("id", f"word-{i}")),
                    "text": (w.get("word") or w.get("text") or "").strip(),
                    "start": float(w.get("start", 0)),
                    "end": float(w.get("end", 0))
                })

        duration_seconds = words[-1]["end"] if words else 10.0

        # Auto-pick hero words if not provided (e.g. longest 3 Telugu words)
        if not hero_word_ids:
            sorted_words = sorted(words, key=lambda x: len(x["text"]), reverse=True)
            hero_word_ids = [w["id"] for w in sorted_words[:3]]

        # 4. If 3D_CLIMAX, run background separation
        matte_src = None
        plate_src = None
        if style_name == "3D_CLIMAX":
            print("✂️ Running AI Person Segmentation (u2net / remove-background)...")
            matte_dir = os.path.join(work_dir, "matte")
            os.makedirs(matte_dir, exist_ok=True)
            
            matte_cmd = [
                "npx", "hyperframes", "remove-background",
                local_video,
                "--output", matte_dir
            ]
            subprocess.run(matte_cmd, cwd=work_dir, check=False)

            subject_webm = os.path.join(matte_dir, "subject.webm")
            plate_webm = os.path.join(matte_dir, "plate.webm")
            if os.path.exists(subject_webm) and os.path.exists(plate_webm):
                matte_src = "matte/subject.webm"
                plate_src = "matte/plate.webm"
                print("✅ Person matte separated successfully!")
            else:
                print("⚠️ Matte generation skipped or fallback to standard composite.")

        # 5. Build composition HTML
        dim_map = {
            "9:16": (1080, 1920),
            "1:1": (1080, 1080),
            "16:9": (1920, 1080)
        }
        width, height = dim_map.get(aspect_ratio, (1080, 1920))
        comp_dir = os.path.join(work_dir, "composition")
        os.makedirs(comp_dir, exist_ok=True)

        html_content = generate_composition_html(
            comp_id=project_id,
            width=width,
            height=height,
            duration_seconds=duration_seconds,
            words=words,
            hero_word_ids=hero_word_ids,
            video_src="../input.mp4",
            matte_src=f"../{matte_src}" if matte_src else None,
            plate_src=f"../{plate_src}" if plate_src else None,
            style=style_name
        )

        with open(os.path.join(comp_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(html_content)

        # 6. Render via HyperFrames
        output_mp4 = os.path.join(work_dir, "output.mp4")
        print("🚀 Invoking HyperFrames headless Chromium render...")
        render_cmd = [
            "npx", "hyperframes", "render",
            comp_dir,
            "--output", output_mp4,
            "--quality", "high",
            "--fps", "30"
        ]
        subprocess.run(render_cmd, cwd=work_dir, check=True)

        if not os.path.exists(output_mp4) or os.path.getsize(output_mp4) < 1000:
            raise RuntimeError("HyperFrames render produced empty or missing MP4 file")

        # 7. Upload to Cloudflare R2
        export_s3_key = f"exports/{project_id}-hyperframes.mp4"
        print(f"☁️ Uploading finished MP4 to R2: {export_s3_key}")
        s3.upload_file(
            output_mp4,
            bucket_name,
            export_s3_key,
            ExtraArgs={"ContentType": "video/mp4"}
        )

        # Generate public/presigned URL or store key
        export_url = f"https://pub-your-r2.r2.dev/{export_s3_key}"

        # 8. Update Supabase
        supabase.table("projects").update({
            "export_status": "ready",
            "export_url": export_url
        }).eq("id", project_id).execute()

        render_duration = round(time.time() - start_time, 2)
        print(f"🎉 [HyperFrames] Complete in {render_duration}s! Export ready at {export_s3_key}")

        return {
            "status": "success",
            "project_id": project_id,
            "export_s3_key": export_s3_key,
            "render_duration_seconds": render_duration
        }

    except Exception as e:
        err_msg = str(e)
        print(f"❌ [HyperFrames] Render failed: {err_msg}")
        supabase.table("projects").update({
            "export_status": "failed"
        }).eq("id", project_id).execute()
        raise e
    finally:
        # Cleanup temp directory
        import shutil
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir, ignore_errors=True)

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("vidyut-secrets")]
)
@modal.fastapi_endpoint(method="POST")
def trigger_hyperframes(data: dict):
    project_id = data.get("project_id")
    user_id = data.get("user_id")
    style_name = data.get("style_name", "3D_CLIMAX")
    aspect_ratio = data.get("aspect_ratio", "9:16")
    hero_word_ids = data.get("hero_word_ids", [])

    if not project_id:
        return {"error": "Missing project_id"}, 400

    process_hyperframes_render.spawn(
        project_id=project_id,
        user_id=user_id,
        style_name=style_name,
        aspect_ratio=aspect_ratio,
        hero_word_ids=hero_word_ids
    )

    return {
        "status": "queued",
        "project_id": project_id,
        "style": style_name
    }
