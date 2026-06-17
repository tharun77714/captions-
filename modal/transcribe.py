import os
import modal
import subprocess
import time
import uuid
import json

image = (
    modal.Image.from_registry("python:3.11-slim")
    .apt_install("ffmpeg")
    .pip_install(
        "supabase",
        "boto3==1.34.101",
        "requests",
        "fastapi[standard]",
        "deepgram-sdk==3.7.1",
        "google-genai",
        "pydantic",
        "numpy"
    )
)

app = modal.App(name="vidyut-transcriber")

def log_structured(level: str, stage: str, message: str, project_id: str, request_id: str, duration_ms: float = None, error: str = None, metadata: dict = None):
    log_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "level": level,
        "stage": stage,
        "message": message,
        "project_id": project_id,
        "request_id": request_id,
    }
    if duration_ms is not None:
        log_data["duration_ms"] = round(duration_ms, 2)
    if error:
        log_data["error"] = error
    if metadata:
        log_data["metadata"] = metadata
    print(json.dumps(log_data))

def process_with_llm(segments_data, language):
    from google import genai
    from pydantic import BaseModel
    from typing import List

    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

    class TranslatedSegment(BaseModel):
        id: int
        text: str

    class TranslationResponse(BaseModel):
        romanized: List[TranslatedSegment]
        translated: List[TranslatedSegment]

    lang_map = {
        "te": ("Telugu", "TGLISH/TENGLISH"),
        "ta": ("Tamil", "TANGLISH"),
        "kn": ("Kannada", "KANGLISH"),
        "ml": ("Malayalam", "MANGLISH"),
        "hi": ("Hindi", "HINGLISH"),
        "en": ("English", "ENGLISH")
    }
    lang_name, lang_style = lang_map.get(language, (language, "internet slang/romanization"))

    system_prompt = f"""You are NOT a transliteration engine.

You are an expert {lang_name} social media creator, subtitle writer, and editor.

Your job is to convert {lang_name} transcripts into NATURAL {lang_style} exactly how real {lang_name} people type on:
- WhatsApp
- Instagram
- YouTube comments
- Reels captions
- Creator videos

CRITICAL RULES

1. DO NOT perform letter-by-letter transliteration.
BAD: Rīseṇṭ gā cālā mandi, Inphlūyensar, Prōḍakṭ
GOOD: Recent ga chala mandi, Influencer, Product

2. ALWAYS prioritize readability over linguistic correctness.
BAD: Elā unnāvu brō
GOOD: Ela unnavu bro

3. Preserve English words exactly.
Examples: ఫాలోవర్స్ → followers, బ్రాండ్ → brand, ఇన్ఫ్లుయెన్సర్ → influencer, ప్రొడక్ట్ → product, స్కిన్ కేర్ → skin care, వీడియో → video

4. Preserve brand names exactly.
Examples: Nike, Apple, Samsung, EBrands.
Never transliterate brand names.

5. Fix obvious ASR mistakes using sentence context.
You are allowed to correct obvious recognition mistakes (e.g., Salaamandi → Chala mandi, fielder → founder).

6. Write how a {lang_name} creator would naturally type.
Examples: చాలా మంది → chala mandi, ఏమైంది → em ayindi, ఏంటి → enti, అసలు → asalu.

7. Preserve numbers and percentages.
50%, 10%, 2025 must remain unchanged.

8. Preserve scientific terms in English.
గ్లైకోలిక్ యాసిడ్ → glycolic acid, లాక్టిక్ యాసిడ్ → lactic acid.

9. Never output Sanskrit, IAST, academic transliteration, or diacritics.
Forbidden characters: ā, ī, ū, ē, ō, ṛ, ṅ, ñ, ṭ, ḍ, ṣ

10. Romanized output must look like a real Instagram caption.
BAD: Rīseṇṭ gā cālā mandi nā phālovars
GOOD: Recent ga chala mandi naa followers

11. If the source contains mixed {lang_name} + English, keep English exactly as-is.

Your goal is NOT transliteration accuracy.
Your goal is: "Would a {lang_name} Instagram creator naturally type this?"
If not, rewrite it until the answer is YES.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{system_prompt}\n\nSegments:\n{json.dumps(segments_data)}",
            config={
                "response_mime_type": "application/json",
                "response_schema": TranslationResponse
            }
        )
        parsed = json.loads(response.text)
        return parsed
    except Exception as e:
        print(f"LLM translation error: {e}")
        return None

@app.function(
    image=image,
    timeout=1800,
    secrets=[modal.Secret.from_name("vidyut-secrets")]
)
def process_video(project_id: str, s3_key: str, source_language: str = "auto", request_id: str = None):
    import boto3
    from supabase import create_client, Client
    from deepgram import DeepgramClient, PrerecordedOptions, FileSource

    if not request_id:
        request_id = str(uuid.uuid4())

    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)

    try:
        log_structured("INFO", "init", "Starting Deepgram pipeline", project_id, request_id)
        supabase.table("projects").update({"status": "transcribing"}).eq("id", project_id).execute()

        t_start = time.time()
        r2_account_id = os.environ.get("R2_ACCOUNT_ID")
        r2_access_key = os.environ.get("R2_ACCESS_KEY_ID")
        r2_secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
        bucket_name = os.environ.get("R2_BUCKET_NAME", "vidyut-media-production")
        
        s3 = boto3.client(
            "s3",
            endpoint_url=f"https://{r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=r2_access_key,
            aws_secret_access_key=r2_secret_key,
            region_name="auto"
        )
        
        local_video_path = f"/tmp/{project_id}_raw.mp4"
        local_audio_path = f"/tmp/{project_id}_audio.wav"
        
        s3.download_file(bucket_name, s3_key, local_video_path)
        log_structured("INFO", "download", "Download complete", project_id, request_id, (time.time() - t_start) * 1000)

        # Extract audio using FFmpeg
        t_start = time.time()
        if os.path.getsize(local_video_path) == 0:
            raise ValueError("Downloaded video file is empty (0 bytes).")

        subprocess.run([
            "ffmpeg", "-i", local_video_path,
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            local_audio_path, "-y"
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        log_structured("INFO", "audio_extraction", "Audio extraction complete", project_id, request_id, (time.time() - t_start) * 1000)

        pipeline_start = time.time()
        
        # Extract waveform peaks
        t_start = time.time()
        waveform_data = []
        try:
            import wave
            import numpy as np
            with wave.open(local_audio_path, 'rb') as wf:
                n_frames = wf.getnframes()
                audio_data = wf.readframes(n_frames)
                samples = np.frombuffer(audio_data, dtype=np.int16)
                samples_per_pixel = 160 
                num_pixels = len(samples) // samples_per_pixel
                if num_pixels > 0:
                    reshaped = samples[:num_pixels * samples_per_pixel].reshape(num_pixels, samples_per_pixel)
                    peaks = np.max(np.abs(reshaped), axis=1)
                    max_peak = np.max(peaks) if np.max(peaks) > 0 else 1
                    waveform_data = (peaks / max_peak * 100).astype(int).tolist()
            log_structured("INFO", "waveform", "Waveform extraction complete", project_id, request_id, (time.time() - t_start) * 1000)
        except Exception as we:
            log_structured("WARNING", "waveform", "Failed to extract waveform", project_id, request_id, error=str(we))

        # 1. Transcribe with Deepgram Nova-3
        t_start = time.time()
        log_structured("INFO", "asr_transcribe", "Sending to Deepgram API", project_id, request_id)
        
        deepgram = DeepgramClient(os.environ.get("DEEPGRAM_API_KEY"))
        with open(local_audio_path, "rb") as file:
            buffer_data = file.read()
        
        payload: FileSource = {"buffer": buffer_data}
        brand_keywords = []
        
        options_dict = {
            "model": "nova-3",
            "smart_format": True,
            "punctuate": True,
            "utterances": True,
            "paragraphs": True
        }
        
        if source_language == "auto":
            options_dict["detect_language"] = True
        else:
            options_dict["detect_language"] = False
            options_dict["language"] = source_language
        
        if brand_keywords:
            options_dict["keywords"] = brand_keywords
            
        options = PrerecordedOptions(**options_dict)
        
        response = deepgram.listen.rest.v("1").transcribe_file(payload, options)
        result = json.loads(response.to_json())
        
        channel = result["results"]["channels"][0]
        detected_language = channel["alternatives"][0].get("detected_language")
        
        if source_language != "auto":
            language = source_language
        else:
            language = detected_language or "en"
            
        utterances = result["results"].get("utterances", [])
        
        log_structured("INFO", "asr_transcribe", f"Deepgram complete. Used language: {language}", project_id, request_id, (time.time() - t_start) * 1000, metadata={"language": language, "detected_language": detected_language})

        # 2. Format Native Output & Prep LLM Payload
        all_segments = []
        all_words = []
        
        llm_payload = []
        global_word_index = 0
        deepgram_word_map = {}
        
        for idx, u in enumerate(utterances):
            seg_start = u["start"]
            seg_end = u["end"]
            seg_text = u["transcript"]
            
            all_segments.append({
                "id": idx,
                "start": seg_start,
                "end": seg_end,
                "text": seg_text
            })
            
            seg_words_payload = []
            for w in u["words"]:
                word_obj = {
                    "start": w["start"],
                    "end": w["end"],
                    "word": w["word"],
                    "probability": w["confidence"]
                }
                all_words.append(word_obj)
                deepgram_word_map[global_word_index] = word_obj
                seg_words_payload.append({
                    "id": global_word_index,
                    "word": w["word"]
                })
                global_word_index += 1
            
            llm_payload.append({
                "id": idx,
                "text": seg_text,
                "words": seg_words_payload
            })

        # 3. Enhance with LLM Transliteration
        t_start = time.time()
        log_structured("INFO", "llm_enhance", "Translating and transliterating with OpenAI", project_id, request_id)
        
        llm_result = process_with_llm(llm_payload, language)
        
        all_translit_segments = []
        all_translit_words = []
        all_translated_segments = []
        
        if llm_result and "romanized" in llm_result and "translated" in llm_result:
            # We match by ID or simply zip if lengths match. Zipping is safer.
            rom_dict = {s["id"]: s for s in llm_result["romanized"]}
            trans_dict = {s["id"]: s for s in llm_result["translated"]}
            
            for orig_seg in all_segments:
                seg_id = orig_seg["id"]
                
                rom_text = rom_dict.get(seg_id, {}).get("text", orig_seg["text"])
                trans_text = trans_dict.get(seg_id, {}).get("text", orig_seg["text"])
                
                all_translit_segments.append({
                    "id": seg_id,
                    "start": orig_seg["start"],
                    "end": orig_seg["end"],
                    "text": rom_text
                })
                all_translated_segments.append({
                    "id": seg_id,
                    "start": orig_seg["start"],
                    "end": orig_seg["end"],
                    "text": trans_text
                })
            
            # Since word mapping is removed in this version, fallback to original words
            all_translit_words = all_words
        else:
            # Fallback if LLM fails
            all_translit_segments = all_segments
            all_translated_segments = all_segments
            all_translit_words = all_words

        log_structured("INFO", "llm_enhance", "LLM processing complete", project_id, request_id, (time.time() - t_start) * 1000)

        # 4. Save to Database
        t_start = time.time()
        log_structured("INFO", "database_write", "Saving to Supabase", project_id, request_id)
        
        supabase.table("transcriptions").insert({
            "project_id": project_id,
            "language": language,
            "segments": all_segments,
            "words": all_words,
            "transliterated_segments": all_translit_segments,
            "transliterated_words": all_translit_words,
            "translated_segments": all_translated_segments
        }).execute()

        # Update project status
        project_res = supabase.table("projects").select("title, subtitle_style").eq("id", project_id).single().execute()
        current_title = project_res.data.get("title", "") if project_res.data else ""
        subtitle_style = project_res.data.get("subtitle_style") or {}
        
        subtitle_style["_debugInfo"] = {
            "selected_language": source_language,
            "deepgram_language_used": language,
            "deepgram_detected_language": detected_language
        }
        
        update_payload = {"status": "ready", "subtitle_style": subtitle_style}
        if current_title.startswith("[FAILED]"):
            update_payload["title"] = current_title.replace("[FAILED] ", "").replace("[FAILED]", "") or "Video Project"
        supabase.table("projects").update(update_payload).eq("id", project_id).execute()
        log_structured("INFO", "database_write", "Database write complete", project_id, request_id, (time.time() - t_start) * 1000)
        
        log_structured("INFO", "pipeline_complete", "Transcription pipeline complete", project_id, request_id, (time.time() - pipeline_start) * 1000)

        if os.path.exists(local_video_path): os.remove(local_video_path)
        if os.path.exists(local_audio_path): os.remove(local_audio_path)

    except Exception as e:
        error_message = str(e)
        log_structured("ERROR", "pipeline_failed", "Pipeline failed with exception", project_id, request_id, error=error_message)
        
        try:
            supabase.table("projects").update({
                "status": "failed",
                "title": f"[FAILED] {error_message}"[:255]
            }).eq("id", project_id).execute()
        except Exception as db_err:
            log_structured("ERROR", "database_failed", "Failed to update project status", project_id, request_id, error=str(db_err))

        if 'local_video_path' in locals() and os.path.exists(local_video_path): os.remove(local_video_path)
        if 'local_audio_path' in locals() and os.path.exists(local_audio_path): os.remove(local_audio_path)
        raise e

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("vidyut-secrets")]
)
@modal.fastapi_endpoint(method="POST")
def trigger(data: dict):
    project_id = data.get("project_id")
    s3_key = data.get("s3_key")
    source_language = data.get("source_language", "auto")
    request_id = data.get("request_id") or str(uuid.uuid4())
    
    if not project_id or not s3_key:
        return {"error": "Missing project_id or s3_key"}, 400
    
    process_video.spawn(project_id, s3_key, source_language, request_id)
    return {"status": "started", "project_id": project_id, "request_id": request_id}
