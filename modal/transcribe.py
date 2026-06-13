import os
import modal
import subprocess
import time
import uuid
import json

image = (
    modal.Image.from_registry("nvidia/cuda:12.2.2-cudnn8-runtime-ubuntu22.04", add_python="3.11")
    .apt_install("ffmpeg", "git")
    .pip_install(
        "faster-whisper>=1.2.0",
        "supabase==2.4.5",
        "boto3==1.34.101",
        "requests",
        "transformers",
        "torchaudio",
        "git+https://github.com/m-bain/whisperx.git",
        "fastapi[standard]"
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

@app.function(
    image=image,
    gpu="A10G",
    timeout=1800,
    secrets=[modal.Secret.from_name("vidyut-secrets")]
)
def process_video(project_id: str, s3_key: str, request_id: str = None):
    import boto3
    import whisperx
    from supabase import create_client, Client

    if not request_id:
        request_id = str(uuid.uuid4())

    # Initialize Supabase
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)

    try:
        log_structured("INFO", "init", "Starting transcription pipeline", project_id, request_id)
        
        # Update status to transcribing
        supabase.table("projects").update({"status": "transcribing"}).eq("id", project_id).execute()

        # Download from R2
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
        
        log_structured("INFO", "download", f"Downloading {s3_key} from R2", project_id, request_id)
        s3.download_file(bucket_name, s3_key, local_video_path)
        log_structured("INFO", "download", "Download complete", project_id, request_id, (time.time() - t_start) * 1000)

        # Extract audio using FFmpeg
        t_start = time.time()
        log_structured("INFO", "audio_extraction", "Extracting audio with FFmpeg", project_id, request_id)
        
        # Verify video file is not corrupted
        if os.path.getsize(local_video_path) == 0:
            raise ValueError("Downloaded video file is empty (0 bytes).")

        subprocess.run([
            "ffmpeg", "-i", local_video_path,
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            local_audio_path, "-y"
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        log_structured("INFO", "audio_extraction", "Audio extraction complete", project_id, request_id, (time.time() - t_start) * 1000)

        pipeline_start = time.time()
        
        # 1. Transcribe with WhisperX (faster-whisper large-v3)
        t_start = time.time()
        log_structured("INFO", "asr_load", "Loading WhisperX transcription model", project_id, request_id)
        device = "cuda"
        compute_type = "float16"
        model = whisperx.load_model("large-v3", device, compute_type=compute_type)
        log_structured("INFO", "asr_load", "ASR model loaded", project_id, request_id, (time.time() - t_start) * 1000)
        
        t_start = time.time()
        log_structured("INFO", "asr_transcribe", "Transcribing audio", project_id, request_id)
        audio = whisperx.load_audio(local_audio_path)
        result = model.transcribe(audio, batch_size=16)
        language = result.get("language", "en")
        log_structured("INFO", "asr_transcribe", f"ASR complete. Detected language: {language}", project_id, request_id, (time.time() - t_start) * 1000, metadata={"language": language})

        # 2. Align output with XLS-R models (MIT licensed) for Indic scripts
        align_model_name = None
        if language == "te":
            align_model_name = "anuragshas/wav2vec2-large-xlsr-53-telugu"
        elif language == "ta":
            align_model_name = "Sreerag/wav2vec2-large-xlsr-53-tamil"
        elif language == "kn":
            align_model_name = "anuragshas/wav2vec2-large-xlsr-53-kannada"
        elif language == "ml":
            align_model_name = "gvs/wav2vec2-large-xlsr-53-malayalam"
        elif language == "hi":
            align_model_name = "jonatasgrosman/wav2vec2-large-xlsr-53-hindi"

        if align_model_name:
            t_start = time.time()
            log_structured("INFO", "align_load", f"Loading alignment model: {align_model_name}", project_id, request_id)
            try:
                align_model, metadata = whisperx.load_align_model(
                    language_code=language,
                    device=device,
                    model_name=align_model_name
                )
                log_structured("INFO", "align_load", "Alignment model loaded", project_id, request_id, (time.time() - t_start) * 1000)
                
                t_start = time.time()
                log_structured("INFO", "align_run", "Running forced alignment", project_id, request_id)
                result = whisperx.align(
                    result["segments"],
                    align_model,
                    metadata,
                    audio,
                    device,
                    return_char_alignments=False
                )
                log_structured("INFO", "align_run", "Forced alignment successful", project_id, request_id, (time.time() - t_start) * 1000)
            except Exception as ae:
                log_structured("WARNING", "align_run", f"Forced alignment failed, falling back to default Whisper timestamps", project_id, request_id, error=str(ae))

        # 3. Pyannote Diarization (MIT licensed)
        hf_token = os.environ.get("HF_TOKEN")
        if hf_token:
            t_start = time.time()
            log_structured("INFO", "diarization_run", "Running speaker diarization", project_id, request_id)
            try:
                diarize_model = whisperx.DiarizationPipeline(use_auth_token=hf_token, device=device)
                diarize_segments = diarize_model(audio)
                result = whisperx.assign_word_speakers(diarize_segments, result)
                log_structured("INFO", "diarization_run", "Speaker diarization complete", project_id, request_id, (time.time() - t_start) * 1000)
            except Exception as de:
                log_structured("WARNING", "diarization_run", "Diarization failed, proceeding without speakers", project_id, request_id, error=str(de))
        else:
            log_structured("INFO", "diarization_run", "HF_TOKEN not found, skipping diarization", project_id, request_id)

        # Format outputs to match DB expectations
        t_start = time.time()
        log_structured("INFO", "database_write", "Formatting and saving to database", project_id, request_id)
        all_segments = []
        all_words = []
        
        for idx, segment in enumerate(result.get("segments", [])):
            all_segments.append({
                "id": idx,
                "start": segment.get("start", 0.0),
                "end": segment.get("end", 0.0),
                "text": segment.get("text", "").strip(),
                "speaker": segment.get("speaker", None)
            })
            
            for word in segment.get("words", []):
                all_words.append({
                    "start": word.get("start", 0.0),
                    "end": word.get("end", 0.0),
                    "word": word.get("word", "").strip(),
                    "probability": word.get("score", 1.0),
                    "speaker": word.get("speaker", None)
                })

        # Save transcript to transcriptions table
        supabase.table("transcriptions").insert({
            "project_id": project_id,
            "language": language,
            "segments": all_segments,
            "words": all_words
        }).execute()

        # Update project status to ready
        supabase.table("projects").update({"status": "ready"}).eq("id", project_id).execute()
        log_structured("INFO", "database_write", "Database write complete", project_id, request_id, (time.time() - t_start) * 1000)
        
        log_structured("INFO", "pipeline_complete", "Transcription pipeline complete", project_id, request_id, (time.time() - pipeline_start) * 1000)

        # Cleanup temp files
        if os.path.exists(local_video_path): os.remove(local_video_path)
        if os.path.exists(local_audio_path): os.remove(local_audio_path)

    except Exception as e:
        error_message = str(e)
        log_structured("ERROR", "pipeline_failed", "Pipeline failed with exception", project_id, request_id, error=error_message)
        
        # Update database with failed status
        try:
            supabase.table("projects").update({
                "status": "failed",
                "title": f"[FAILED] {error_message}"[:255]
            }).eq("id", project_id).execute()
        except Exception as db_err:
            log_structured("ERROR", "database_failed", "Failed to update project status to failed in Supabase", project_id, request_id, error=str(db_err))

        # Cleanup temp files if they exist
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
    request_id = data.get("request_id") or str(uuid.uuid4())
    
    if not project_id or not s3_key:
        return {"error": "Missing project_id or s3_key"}, 400
    
    # Spawn background task
    process_video.spawn(project_id, s3_key, request_id)
    return {"status": "started", "project_id": project_id, "request_id": request_id}
