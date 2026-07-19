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
    import json
    import os
    import time
    import re
    from google import genai
    from pydantic import BaseModel
    from typing import List
    from google.genai import types

    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

    class TranslatedWord(BaseModel):
        word: str
        source_word_ids: List[int]
        confidence: float

    class TranslatedSegment(BaseModel):
        id: int
        text: str
        words: List[TranslatedWord]

    class TranslationResponse(BaseModel):
        schema_version: int
        romanized: List[TranslatedSegment]
        translated: List[TranslatedSegment]

    if language == "en":
        system_prompt = """You are a professional subtitle translator and creator.
Your job is to translate the English transcript segments into two formats:
1. 'translated': Native Telugu script (à°¤à±†à°²à± à°—à±  à°²à°¿à°ªà°¿). Translate the meaning naturally and accurately.
2. 'romanized': Tenglish (Romanized Telugu) exactly how real Telugu people type on WhatsApp and Instagram.

CRITICAL RULES FOR ALIGNMENT AND TRANSLATION:
- OUTPUT SCHEMA: Must include "schema_version": 1.
- For 'translated', output natural Telugu text in Telugu script.
- For 'romanized', output clean Tenglish text. Keep English technical/brand words in English letters.
- Maintain the exact same segment IDs in the exact original order. Do not combine or split segments.
- Break the translated/romanized text into individual words in the `words` array.
- For each translated word, provide a `source_word_ids` array containing the integer IDs of the original words from the input that correspond to this translated word.
- NEVER invent timestamps or source IDs. Only use IDs that exist in the input segment.
- Every semantic unit should be represented.
- Translation mapping supports 1-to-1, 1-to-many, many-to-1, and many-to-many.
- If grammatical differences require inserting words, attach the inserted words to the nearest semantic source word ID.
- Preserve translated word order exactly.
- Strip all punctuation from the `word` field.
- Provide a `confidence` score (0.0 to 1.0) for each word's alignment accuracy.
"""
    else:
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
2. 'romanized': {lang_style} (Romanized {lang_name}) exactly how real {lang_name} people naturally type on social media.

CRITICAL RULES FOR ALIGNMENT AND TRANSLATION:
- OUTPUT SCHEMA: Must include "schema_version": 1.
- For 'translated', output natural, high-quality English translation.
- For 'romanized', do NOT do literal letter-by-letter transliteration. Write the natural spoken words in Roman letters.
- Keep brand names and English terms exactly in English letters.
- Maintain the exact same segment IDs in the exact original order. Do not combine or split segments.
- Break the translated/romanized text into individual words in the `words` array.
- For each translated word, provide a `source_word_ids` array containing the integer IDs of the original words from the input that correspond to this translated word.
- NEVER invent timestamps or source IDs. Only use IDs that exist in the input segment.
- Every semantic unit should be represented.
- Translation mapping supports 1-to-1, 1-to-many, many-to-1, and many-to-many.
- If grammatical differences require inserting words, attach the inserted words to the nearest semantic source word ID.
- Preserve translated word order exactly.
- Strip all punctuation from the `word` field.
- Provide a `confidence` score (0.0 to 1.0) for each word's alignment accuracy.
"""


    def run_validation_pipeline(parsed_data, input_segments, language):
        VALIDATOR_VERSION = "2026.07.v2"
        
        # 1. Structural Validation
        valid_ids_in_order = [seg["id"] for seg in input_segments]
        
        total_source_words = sum(len(seg.get("words", [])) for seg in input_segments)
        if total_source_words == 0:
            return {"passed": True, "repairs": 0}
            
        for format_key in ["romanized", "translated"]:
            segments = parsed_data.get(format_key, [])
            if len(segments) != len(input_segments):
                raise ValueError(f"Structural: Segment count mismatch for {format_key}")
            
            for i, seg in enumerate(segments):
                if seg.get("id") != valid_ids_in_order[i]:
                    raise ValueError(f"Structural: Segment ID mismatch or out of order at index {i} for {format_key}")

        # 2. Auto-Repair Pass
        repairs = {"ids": 0, "confidence": 0, "empty": 0, "whitespace": 0}
        
        def repair_pass(data):
            for format_key in ["romanized", "translated"]:
                for seg in data.get(format_key, []):
                    valid_source_ids = set(w["id"] for input_seg in input_segments if input_seg["id"] == seg["id"] for w in input_seg.get("words", []))
                    
                    new_words = []
                    for w in seg.get("words", []):
                        if not w.get("word") or not w.get("word").strip():
                            repairs["empty"] += 1
                            continue
                        
                        original_word = w.get("word")
                        w["word"] = w["word"].strip()
                        if w["word"] != original_word:
                            repairs["whitespace"] += 1
                        
                        conf = w.get("confidence")
                        if not isinstance(conf, (int, float)) or not (0 <= conf <= 1.0):
                            w["confidence"] = 0.8
                            repairs["confidence"] += 1
                        
                        sids = w.get("source_word_ids", [])
                        sids_clean = []
                        for sid in sids:
                            if sid in valid_source_ids and sid not in sids_clean:
                                sids_clean.append(sid)
                        
                        if len(sids) != len(sids_clean):
                            repairs["ids"] += 1
                            
                        w["source_word_ids"] = sids_clean
                        new_words.append(w)
                    
                    seg["words"] = new_words

        repair_pass(parsed_data)
        
        # 3. Budget Check
        total_words_generated = sum(len(seg.get("words", [])) for f in ["romanized", "translated"] for seg in parsed_data.get(f, []))
        total_repairs = sum(repairs.values())
        denominator = max(total_words_generated, total_source_words, 1)
        if (total_repairs / denominator) > 0.15:
            raise ValueError(f"Budget: Too many repairs needed ({total_repairs}/{denominator})")
            
        # 4. Idempotency Check
        repairs_before = dict(repairs)
        repair_pass(parsed_data)
        if repairs != repairs_before:
            raise ValueError("Idempotency: Auto-repair is not stable")

        # 5. Semantic Validation
        for format_key in ["romanized", "translated"]:
            for i, seg in enumerate(parsed_data.get(format_key, [])):
                input_seg = input_segments[i]
                input_word_count = len(input_seg.get("words", []))
                
                # Per-segment coverage
                covered_ids = set()
                source_id_usage_counts = {}
                for w in seg.get("words", []):
                    for sid in w.get("source_word_ids", []):
                        covered_ids.add(sid)
                        source_id_usage_counts[sid] = source_id_usage_counts.get(sid, 0) + 1
                        
                if input_word_count > 0:
                    coverage = len(covered_ids) / input_word_count
                    if coverage < 0.90:
                        raise ValueError(f"Semantic: Coverage too low ({coverage:.2f} < 0.90) for segment {seg['id']} in {format_key}")
                        
                # Duplicate ID reuse detection
                if any(count > 4 for count in source_id_usage_counts.values()):
                    raise ValueError(f"Semantic: Excessive source_word_id reuse detected in segment {seg['id']}")
                
                # Reconstruction Check (Token based)
                reconstructed_tokens = [re.sub(r'\W+', '', w.get("word", "")).lower() for w in seg.get("words", [])]
                reconstructed_tokens = [t for t in reconstructed_tokens if t]
                original_tokens = [re.sub(r'\W+', '', t).lower() for t in seg.get("text", "").split()]
                original_tokens = [t for t in original_tokens if t]
                
                if len(reconstructed_tokens) > 0 and len(original_tokens) > 0:
                    ratio = len(reconstructed_tokens) / len(original_tokens)
                    if ratio < 0.5 or ratio > 2.0:
                        raise ValueError(f"Semantic: Bad token reconstruction ratio {ratio:.2f} for segment {seg['id']}")
                        
                # Hallucination loops check
                if len(reconstructed_tokens) > 5:
                    unique_ratio = len(set(reconstructed_tokens)) / len(reconstructed_tokens)
                    if unique_ratio < 0.2:
                        raise ValueError(f"Semantic: Repetitive hallucination loop detected in segment {seg['id']}")
                        
                # Language verification
                text_str = "".join(reconstructed_tokens)
                if format_key == "romanized" and text_str:
                    # Expect mostly latin/ascii
                    ascii_count = sum(1 for c in text_str if ord(c) < 128)
                    if (ascii_count / len(text_str)) < 0.8:
                        raise ValueError(f"Semantic: Romanized output contains too many non-Latin characters in segment {seg['id']}")
                if format_key == "translated" and text_str:
                    if language == "en":
                        # English -> translates to Telugu script
                        telugu_count = sum(1 for c in text_str if 0x0C00 <= ord(c) <= 0x0C7F)
                        if (telugu_count / len(text_str)) < 0.5:
                            raise ValueError(f"Semantic: Translated output missing expected Telugu script in segment {seg['id']}")
                    else:
                        # Other languages -> translate to English (Latin script)
                        ascii_count = sum(1 for c in text_str if ord(c) < 128)
                        if (ascii_count / len(text_str)) < 0.8:
                            raise ValueError(f"Semantic: Translated output contains too many non-Latin characters in segment {seg['id']}")

        return {
            "passed": True,
            "validator_version": VALIDATOR_VERSION,
            "repairs": total_repairs,
            "repair_breakdown": repairs
        }


    contents = f"{system_prompt}\n\nSegments:\n{json.dumps(segments_data)}"
    
    max_retries = 2
    validation_error_message = None
    
    for attempt in range(max_retries + 1):
        try:
            current_contents = contents
            if attempt > 0 and validation_error_message:
                current_contents += f"\n\nWARNING: Previous validation failed with error:\n{validation_error_message}\nDo NOT repeat the previous error. Regenerate the entire JSON with correct mapping and coverage."
                
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=current_contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=TranslationResponse,
                    temperature=0.0
                )
            )
            parsed = json.loads(response.text)
            validation_report = run_validation_pipeline(parsed, segments_data, language)
            print(f"Validation passed: {json.dumps(validation_report)}")
            return parsed
        except Exception as e:
            validation_error_message = str(e)
            print(f"LLM translation attempt {attempt + 1} failed: {validation_error_message}")
            if attempt == max_retries:
                print("All retries failed, falling back to empty response.")
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
        all_translated_words = []
        
        if llm_result and "romanized" in llm_result and "translated" in llm_result:
            rom_dict = {s["id"]: s for s in llm_result["romanized"]}
            trans_dict = {s["id"]: s for s in llm_result["translated"]}
            
            for orig_seg in all_segments:
                seg_id = orig_seg["id"]
                
                rom_data = rom_dict.get(seg_id, {})
                trans_data = trans_dict.get(seg_id, {})
                
                rom_text = rom_data.get("text", orig_seg["text"])
                trans_text = trans_data.get("text", orig_seg["text"])
                
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
                
                def extract_words(word_list, output_list, lang_format):
                    for i, w in enumerate(word_list):
                        source_ids = w.get("source_word_ids", [])
                        if not source_ids:
                            continue
                        
                        start_time = min((deepgram_word_map[sid]["start"] for sid in source_ids if sid in deepgram_word_map), default=orig_seg["start"])
                        end_time = max((deepgram_word_map[sid]["end"] for sid in source_ids if sid in deepgram_word_map), default=orig_seg["end"])
                        
                        # Ensure start <= end
                        if start_time > end_time:
                            start_time, end_time = end_time, start_time
                            
                        # Ensure within segment
                        start_time = max(orig_seg["start"], start_time)
                        end_time = min(orig_seg["end"], end_time)
                            
                        # Ensure no zero-length words, clamped to segment end
                        if end_time <= start_time:
                            end_time = min(orig_seg["end"], start_time + 0.05)
                            
                        if len(output_list) > 0:
                            prev = output_list[-1]
                            if start_time < prev["start"]:
                                print(f"WARNING: Timeline moved backwards in segment {seg_id}: '{prev['word']}'({prev['start']}) -> '{w.get('word')}'({start_time})")
                            elif start_time < prev["end"] - 0.2:
                                print(f"WARNING: Excessive overlap in segment {seg_id}: '{prev['word']}' ends at {prev['end']}, but '{w.get('word')}' starts at {start_time}")
                            
                        output_list.append({
                            "id": f"tw_{lang_format}_{seg_id}_{i}",
                            "word": w.get("word", ""),
                            "start": start_time,
                            "end": end_time,
                            "probability": w.get("confidence", 1.0)
                        })

                extract_words(rom_data.get("words", []), all_translit_words, "rom")
                extract_words(trans_data.get("words", []), all_translated_words, "trans")
        else:
            all_translit_segments = all_segments
            all_translated_segments = all_segments
            all_translit_words = all_words
            all_translated_words = all_words # fallback to keeping original words structure

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
            "translated_segments": all_translated_segments,
            "translated_words": all_translated_words
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
