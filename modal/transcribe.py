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
        "google-genai==1.5.0",  # pinned to fix httpx conflict with supabase
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

    if language == "en":
        # Video is in English. Translate to Telugu (Native script) and Tenglish (Romanized)
        system_prompt = """You are a professional subtitle translator and creator.
Your job is to translate the English transcript segments into two formats:
1. 'translated': Native Telugu script (తెలుగు లిపి). Translate the meaning naturally and accurately.
2. 'romanized': Tenglish (Romanized Telugu) exactly how real Telugu people type on WhatsApp and Instagram (e.g., "Recent ga chala mandi", "ela unnavu").

CRITICAL RULES:
- For 'translated', output natural Telugu text in Telugu script.
- For 'romanized', output clean Tenglish text. Keep English technical/brand words (like Nike, Apple, glycolic acid, followers, brand) in English letters.
- Never use diacritics or forbidden characters (ā, ī, ū, ē, ō, ṛ, ṅ, ñ, ṭ, ḍ, ṣ).
- Maintain the exact same segment IDs. Do not combine or split segments.
"""
    else:
        # Video is in an Indian language (te, hi, ta, kn, ml). Translate to English and romanize to slang.
        lang_map = {
            "te": ("Telugu", "TGLISH/TENGLISH"),
            "ta": ("Tamil", "TANGLISH"),
            "kn": ("Kannada", "KANGLISH"),
            "ml": ("Malayalam", "MANGLISH"),
            "hi": ("Hindi", "HINGLISH")
        }
        lang_name, lang_style = lang_map.get(language, (language, "internet slang/romanization"))
        
        system_prompt = f"""You are a professional subtitle editor and translator.
Your job is to convert the {lang_name} transcript segments into two formats:
1. 'translated': Natural English translation of the segments.
2. 'romanized': {lang_style} (Romanized {lang_name}) exactly how real {lang_name} people naturally type on social media (WhatsApp, Instagram, comments).

CRITICAL RULES:
- For 'translated', output natural, high-quality English translation of the spoken content.
- For 'romanized', do NOT do literal letter-by-letter transliteration. Write the natural spoken words in Roman letters (e.g. చాలా మంది -> chala mandi, ఏమైంది -> em ayindi).
- Keep brand names and English terms exactly in English letters.
- Never use diacritics (ā, ī, ū, ē, ō, ṛ, ṅ, ñ, ṭ, ḍ, ṣ).
- Maintain the exact same segment IDs. Do not combine or split segments.
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

        # 1. Transcribe with Deepgram
        t_start = time.time()
        log_structured("INFO", "asr_transcribe", "Sending to Deepgram API", project_id, request_id)
        
        deepgram = DeepgramClient(os.environ.get("DEEPGRAM_API_KEY"))
        with open(local_audio_path, "rb") as file:
            buffer_data = file.read()
        
        payload: FileSource = {"buffer": buffer_data}
        brand_keywords = []

        # --- Language detection ---
        # nova-3 detect_language is unreliable for Indian languages (misdetects Telugu as English).
        # So: if auto, first do a cheap nova-2 pass on just the first 30s to detect the language,
        # then do the full nova-3 transcription with the confirmed language code.
        if source_language == "auto":
            try:
                log_structured("INFO", "lang_detect", "Running nova-2 language detection pass", project_id, request_id)
                detect_options = PrerecordedOptions(
                    model="nova-2",
                    detect_language=True,
                    punctuate=False,
                    utterances=False,
                )
                # Use only first 30s of audio for detection — fast and cheap
                import io
                detect_payload: FileSource = {"buffer": buffer_data[:16000 * 2 * 30]}  # 30s at 16kHz 16-bit mono
                detect_response = deepgram.listen.rest.v("1").transcribe_file(detect_payload, detect_options)
                detect_result = json.loads(detect_response.to_json())
                detected_language = detect_result["results"]["channels"][0]["alternatives"][0].get("detected_language") or "en"
                log_structured("INFO", "lang_detect", f"Detected language: {detected_language}", project_id, request_id)
            except Exception as ld_err:
                log_structured("WARNING", "lang_detect", "Language detection failed, defaulting to en", project_id, request_id, error=str(ld_err))
                detected_language = "en"
            language = detected_language
        else:
            detected_language = source_language
            language = source_language

        # --- Full transcription with nova-3 + confirmed language ---
        options_dict = {
            "model": "nova-3",
            "language": language,
            "detect_language": False,
            "smart_format": True,
            "punctuate": True,
            "utterances": True,
            "paragraphs": True,
        }

        if brand_keywords:
            options_dict["keywords"] = brand_keywords
            
        options = PrerecordedOptions(**options_dict)
        
        response = deepgram.listen.rest.v("1").transcribe_file(payload, options)
        result = json.loads(response.to_json())
        
        channel = result["results"]["channels"][0]
        utterances = result["results"].get("utterances", [])
        
        log_structured("INFO", "asr_transcribe", f"Deepgram nova-3 complete. Language: {language}", project_id, request_id, (time.time() - t_start) * 1000, metadata={"language": language, "detected_language": detected_language})

        # 2. Format Native Output & Prep LLM Payload
        all_segments = []
        all_words = []
        llm_payload = []
        
        # Use the channel-level flat word list — always populated by Deepgram.
        # Utterance-level words are often missing for non-English languages (e.g. Telugu/nova-3).
        channel_words = channel.get("alternatives", [{}])[0].get("words", [])
        for w in channel_words:
            all_words.append({
                "start": w["start"],
                "end": w["end"],
                "word": w.get("punctuated_word") or w["word"],
                "probability": w.get("confidence", 1.0)
            })
        
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
            
            # Get words that fall within this utterance's time range
            seg_words_in_range = [
                w for w in channel_words
                if w["start"] >= seg_start and w["end"] <= seg_end + 0.05
            ]
            
            seg_words_payload = []
            for w in seg_words_in_range:
                word_obj = {
                    "start": w["start"],
                    "end": w["end"],
                    "word": w.get("punctuated_word") or w["word"],
                    "probability": w.get("confidence", 1.0)
                }
                deepgram_word_map[global_word_index] = word_obj
                seg_words_payload.append({
                    "id": global_word_index,
                    "word": w.get("punctuated_word") or w["word"]
                })
                global_word_index += 1
            
            llm_payload.append({
                "id": idx,
                "text": seg_text,
                "words": seg_words_payload
            })

        # 3. Enhance with LLM Transliteration
        t_start = time.time()
        log_structured("INFO", "llm_enhance", "Translating and transliterating with Gemini", project_id, request_id)
        
        llm_result = process_with_llm(llm_payload, language)
        
        all_translit_segments = []
        all_translit_words = []
        all_translated_segments = []
        
        if llm_result and "romanized" in llm_result and "translated" in llm_result:
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
            
            all_translit_words = all_words
        else:
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
