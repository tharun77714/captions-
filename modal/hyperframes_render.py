import os
import modal
import subprocess
import time
import uuid
import json
import boto3
from supabase import create_client

from motion_spec import MotionIntentSpec, Archetype
from phrase_engine import build_adaptive_phrases
from composition_builder import generate_hyperframes_html
from motion_diagnostics import audit_motion_density

# Define high-performance Linux container image with Node 22, FFmpeg, Chromium, unzip, and HyperFrames
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "curl", "git", "ca-certificates", "unzip", "chromium", "fonts-noto-core", "fonts-noto-extra")
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
        "apt-get install -y nodejs",
        "npx --yes playwright install-deps chromium",
        "npm install -g hyperframes@0.7.109 gsap yauzl",
        "npx --yes hyperframes browser ensure || true"
    )
    .pip_install(
        "boto3==1.34.101",
        "supabase",
        "requests",
        "fastapi[standard]",
        "pydantic"
    )
    .add_local_dir("modal", remote_path="/root")
)

app = modal.App(name="vidyut-hyperframes", image=image)

def get_s3_client():
    account_id = os.environ.get("R2_ACCOUNT_ID") or "92b92a493e0d155b9f3a36e492f3271b"
    access_key = os.environ.get("R2_ACCESS_KEY_ID") or "8ac17e76d17b3e5dadf67b34368a5598"
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY") or "45c53972643d98db46bce1746a74b7d4cd54f564ba30ed2bbd8070d0aac1c2df"
    endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
    )

def get_supabase_client():
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "https://teydehnwtfeyfmzxcsta.supabase.co"
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRleWRlaG53dGZleWZtenhjc3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI0MjU3MCwiZXhwIjoyMDk2ODE4NTcwfQ.VprBWN0245PWK-yuts_7uj-jiPXQA7bjU_U-7NSIF5k"
    return create_client(url, key)

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
    style_name: str = "kalakar-glow",
    aspect_ratio: str = "9:16",
    hero_word_ids: list = None,
    subtitle_style: dict = None,
    script_mode: str = "original",
    template_id: str = None,
    words_payload: list = None,
    enable_3d: bool = True
):
    start_time = time.time()
    work_dir = f"/tmp/hf_{project_id}_{int(time.time())}"
    os.makedirs(work_dir, exist_ok=True)

    supabase = get_supabase_client()
    s3 = get_s3_client()
    bucket_name = os.environ.get("R2_BUCKET_NAME") or "vidyut-media-production"

    try:
        print(f"🎬 [Vidyut Kinetic Motion Engine] Starting render for project {project_id} (Template/Style: {style_name}, Script: {script_mode})")

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

        # 2. Download source video from R2
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

        # 3. Format transcript words based on user payload or selected script_mode
        raw_words_input = []
        if words_payload and isinstance(words_payload, list) and len(words_payload) > 0:
            print(f"📝 Using {len(words_payload)} edited words directly from editor state")
            for i, w in enumerate(words_payload):
                raw_words_input.append({
                    "id": str(w.get("id", f"word-{i}")),
                    "text": str(w.get("text") or w.get("word") or "").strip(),
                    "start": float(w.get("start", 0)),
                    "end": float(w.get("end", 0))
                })
        else:
            # Check script_mode
            if script_mode in ["transliterated", "romanized"] and transcription.get("transliterated_words"):
                source_words = transcription.get("transliterated_words")
                print("📝 Using Romanized / Transliterated transcript words")
            elif script_mode == "translated" and transcription.get("translated_words"):
                source_words = transcription.get("translated_words")
                print("📝 Using Translated transcript words")
            else:
                source_words = transcription.get("words")
                print("📝 Using Original transcript words")

            if not source_words or not isinstance(source_words, list) or len(source_words) == 0:
                raw_segments = transcription.get("segments", [])
                for seg in raw_segments:
                    for w in seg.get("words", []):
                        raw_words_input.append({
                            "id": str(w.get("id", f"word-{len(raw_words_input)}")),
                            "text": str(w.get("word") or w.get("text") or "").strip(),
                            "start": float(w.get("start", 0)),
                            "end": float(w.get("end", 0))
                        })
            else:
                for i, w in enumerate(source_words):
                    raw_words_input.append({
                        "id": str(w.get("id", f"word-{i}")),
                        "text": str(w.get("word") or w.get("text") or "").strip(),
                        "start": float(w.get("start", 0)),
                        "end": float(w.get("end", 0))
                    })

        duration_seconds = raw_words_input[-1]["end"] if raw_words_input else 10.0

        # Auto-pick hero words if not provided
        if not hero_word_ids:
            sorted_words = sorted(raw_words_input, key=lambda x: len(x["text"]), reverse=True)
            hero_word_ids = [w["id"] for w in sorted_words[:3]]

        # 4. If enable_3d is true or style is 3D, run AI person segmentation
        matte_src = None
        plate_src = None
        should_run_3d = bool(enable_3d or style_name in ["3D_CLIMAX", "cinematic", "3d-climax"])
        if should_run_3d:
            print("✂️ Running AI Person Segmentation (U2Net / remove-background)...")
            matte_dir = os.path.join(work_dir, "matte")
            os.makedirs(matte_dir, exist_ok=True)
            subject_webm = os.path.join(matte_dir, "subject.webm")
            
            matte_cmd = [
                "npx", "hyperframes", "remove-background",
                local_video,
                "--output", subject_webm
            ]
            res_matte = subprocess.run(matte_cmd, cwd=work_dir, capture_output=True, text=True, check=False)
            print(f"Matte output: {res_matte.stdout or res_matte.stderr}")

            if os.path.exists(subject_webm) and os.path.getsize(subject_webm) > 1000:
                matte_src = "matte/subject.webm"
                plate_src = "input.mp4"
                print("✅ Person matte separated successfully!")
            else:
                print("⚠️ Matte generation skipped, fallback to standard composite.")

        # 5. Extract Subtitle Style Properties
        eff_style = subtitle_style or transcription.get("subtitle_style") or {}
        
        font_dict = eff_style.get("font", {})
        font_family = font_dict.get("family", "Montserrat")
        font_weight = int(font_dict.get("weight", 800))
        text_transform = font_dict.get("textTransform", "none")
        
        font_size = int(eff_style.get("fontSize", 56))
        # Ensure optimal scale for 1080x1920 video
        if font_size < 36:
            font_size = int(font_size * 1.5)
            
        letter_spacing = float(eff_style.get("letterSpacing", -0.2))
        line_spacing = float(eff_style.get("lineSpacing", 1.35))
        
        color_dict = eff_style.get("textColor", {})
        if isinstance(color_dict, dict):
            primary_color = color_dict.get("solid", "#FFFFFF")
            gradient_from = color_dict.get("gradientFrom")
            gradient_to = color_dict.get("gradientTo")
        else:
            primary_color = str(color_dict or "#FFFFFF")
            gradient_from = None
            gradient_to = None
            
        active_word_color = eff_style.get("activeWordColor", "#FFE600")
        inactive_opacity = float(eff_style.get("inactiveOpacity", 0.75))
        highlight_mode = eff_style.get("highlightMode", "color")
        
        stroke_dict = eff_style.get("stroke", {})
        stroke_enabled = bool(stroke_dict.get("enabled", True))
        stroke_color = stroke_dict.get("color", "#000000")
        stroke_width = float(stroke_dict.get("width", 2.5))
        
        shadow_dict = eff_style.get("shadow", {})
        shadow_color = shadow_dict.get("color", "rgba(0, 0, 0, 0.85)")
        shadow_blur = float(shadow_dict.get("blur", 12.0))
        shadow_x = float(shadow_dict.get("offsetX", 0.0))
        shadow_y = float(shadow_dict.get("offsetY", 4.0))
        
        bg_dict = eff_style.get("background", {})
        background_enabled = bool(bg_dict.get("enabled", False))
        background_color = bg_dict.get("color", "rgba(0, 0, 0, 0.6)")
        background_padding_x = float(bg_dict.get("paddingX", 24.0))
        background_padding_y = float(bg_dict.get("paddingY", 12.0))
        background_radius = float(bg_dict.get("borderRadius", 8.0))
        
        trans_dict = eff_style.get("transition", {})
        if isinstance(trans_dict, dict):
            transition_type = trans_dict.get("type", "pop")
        else:
            transition_type = str(trans_dict or "pop")
            
        pos_x = float(eff_style.get("positionX", 0.0))
        pos_y = float(eff_style.get("positionY", 0.0))
        alignment = eff_style.get("alignment", "center")

        # 6. Build Adaptive Phrases & MotionIntentSpec
        archetype: Archetype = "viral"
        if "editorial" in style_name.lower():
            archetype = "editorial"
        elif "luxury" in style_name.lower():
            archetype = "luxury"
        elif "tech" in style_name.lower():
            archetype = "tech"
        elif "cinematic" in style_name.lower() or "3d" in style_name.lower():
            archetype = "cinematic"

        phrases = build_adaptive_phrases(raw_words_input, archetype=archetype)

        dim_map = {
            "9:16": (1080, 1920),
            "1:1": (1080, 1080),
            "16:9": (1920, 1080)
        }
        width, height = dim_map.get(aspect_ratio, (1080, 1920))

        spec = MotionIntentSpec(
            composition_id=project_id,
            width=width,
            height=height,
            duration_seconds=duration_seconds,
            fps=30,
            aspect_ratio=aspect_ratio,
            archetype=archetype,
            phrases=phrases,
            hero_word_ids=hero_word_ids,
            enable_subject_separation=bool(matte_src),
            
            # Subtitle styling values
            font_family=font_family,
            font_weight=font_weight,
            font_size=font_size,
            text_transform=text_transform,
            letter_spacing=letter_spacing,
            line_spacing=line_spacing,
            primary_color=primary_color,
            accent_color=active_word_color,
            contrast_color="#38BDF8",
            inactive_opacity=inactive_opacity,
            gradient_from=gradient_from,
            gradient_to=gradient_to,
            stroke_enabled=stroke_enabled,
            stroke_color=stroke_color,
            stroke_width=stroke_width,
            shadow_color=shadow_color,
            shadow_blur=shadow_blur,
            shadow_x=shadow_x,
            shadow_y=shadow_y,
            background_enabled=background_enabled,
            background_color=background_color,
            background_padding_x=background_padding_x,
            background_padding_y=background_padding_y,
            background_radius=background_radius,
            position_x=pos_x,
            position_y=pos_y,
            alignment=alignment,
            highlight_mode=highlight_mode,
            transition_type=transition_type,
            subtitle_style=eff_style
        )

        # 7. Run Motion Diagnostics
        diag = audit_motion_density(spec)
        print(f"📊 [Motion Diagnostics]: {diag}")

        # 8. Generate Composition HTML
        comp_dir = os.path.join(work_dir, "composition")
        os.makedirs(comp_dir, exist_ok=True)

        html_content = generate_hyperframes_html(
            spec=spec,
            video_src="../input.mp4",
            matte_src=f"../{matte_src}" if matte_src else None,
            plate_src=f"../{plate_src}" if plate_src else None
        )

        with open(os.path.join(comp_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(html_content)

        # 9. Render via HyperFrames Headless Chromium
        output_mp4 = os.path.join(work_dir, "output.mp4")
        print("🚀 Invoking HyperFrames headless Chromium render...")
        
        custom_env = os.environ.copy()
        if os.path.exists("/usr/bin/chromium"):
            custom_env["HYPERFRAMES_BROWSER_PATH"] = "/usr/bin/chromium"
        elif os.path.exists("/usr/bin/chromium-browser"):
            custom_env["HYPERFRAMES_BROWSER_PATH"] = "/usr/bin/chromium-browser"

        render_cmd = [
            "npx", "hyperframes", "render",
            comp_dir,
            "--output", output_mp4,
            "--quality", "high",
            "--fps", "30"
        ]
        process = subprocess.Popen(
            render_cmd,
            cwd=work_dir,
            env=custom_env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        for line in iter(process.stdout.readline, ''):
            if line:
                print(line.strip(), flush=True)
        process.stdout.close()
        return_code = process.wait()

        if return_code != 0:
            raise RuntimeError(f"HyperFrames render failed with code {return_code}")

        if not os.path.exists(output_mp4) or os.path.getsize(output_mp4) < 1000:
            raise RuntimeError("HyperFrames render produced empty or missing MP4 file")

        # 10. Upload to Cloudflare R2
        export_s3_key = f"exports/{project_id}-hyperframes.mp4"
        print(f"☁️ Uploading finished MP4 to R2: {export_s3_key}")
        s3.upload_file(
            output_mp4,
            bucket_name,
            export_s3_key,
            ExtraArgs={"ContentType": "video/mp4"}
        )

        export_url = f"/api/video/stream?key={export_s3_key}"

        # 11. Update Supabase
        supabase.table("projects").update({
            "export_status": "ready",
            "export_url": export_url,
            "export_error": None
        }).eq("id", project_id).execute()

        render_duration = round(time.time() - start_time, 2)
        print(f"🎉 [Vidyut Motion Engine] Complete in {render_duration}s! Export ready at {export_s3_key}")

        return {
            "status": "success",
            "project_id": project_id,
            "export_url": export_url,
            "export_s3_key": export_s3_key,
            "render_duration_seconds": render_duration
        }

    except Exception as e:
        import traceback
        err_trace = traceback.format_exc()
        print(f"❌ [HyperFrames Render Error]: {err_trace}")
        try:
            supabase = get_supabase_client()
            supabase.table("projects").update({
                "export_status": "failed",
                "export_error": str(e)
            }).eq("id", project_id).execute()
        except Exception as db_err:
            print(f"⚠️ Failed to update failure status to Supabase: {db_err}")
        raise e
    finally:
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
    style_name = data.get("style_name", "kalakar-glow")
    aspect_ratio = data.get("aspect_ratio", "9:16")
    hero_word_ids = data.get("hero_word_ids", [])
    subtitle_style = data.get("subtitle_style")
    script_mode = data.get("script_mode", "original")
    template_id = data.get("template_id")
    words_payload = data.get("words", [])
    enable_3d = bool(data.get("enable_3d", True))

    if not project_id:
        return {"error": "Missing project_id"}, 400

    process_hyperframes_render.spawn(
        project_id=project_id,
        user_id=user_id,
        style_name=style_name,
        aspect_ratio=aspect_ratio,
        hero_word_ids=hero_word_ids,
        subtitle_style=subtitle_style,
        script_mode=script_mode,
        template_id=template_id,
        words_payload=words_payload,
        enable_3d=enable_3d
    )

    return {
        "status": "queued",
        "project_id": project_id,
        "style": style_name,
        "script_mode": script_mode
    }

