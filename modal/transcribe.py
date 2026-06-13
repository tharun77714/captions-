import os
import modal
import subprocess
import time

image = (
    modal.Image.from_registry("nvidia/cuda:12.2.2-cudnn8-runtime-ubuntu22.04", add_python="3.11")
    .apt_install("ffmpeg", "git")
    .pip_install(
        "faster-whisper==1.0.3",
        "supabase==2.4.5",
        "boto3==1.34.101",
        "requests",
        "pyannote.audio==3.1.1",
        "transformers",
        "torchaudio",
        "git+https://github.com/m-bain/whisperx.git"
    )
)

app = modal.App(name="vidyut-transcriber")

@app.function(
    image=image,
    gpu="A10G", # Upgraded to A10G for larger memory capacity for parallel models (Whisper + Aligner + Pyannote)
    timeout=1800,
    secrets=[modal.Secret.from_name("vidyut-secrets")]
)
def process_video(project_id: str, s3_key: str):
    import boto3
    import whisperx
    from supabase import create_client, Client

    # Initialize Supabase
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)

    try:
        # Update status to transcribing
        supabase.table("projects").update({"status": "transcribing"}).eq("id", project_id).execute()

        # Download from R2
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
        
        print(f"Downloading {s3_key} from R2...")
        s3.download_file(bucket_name, s3_key, local_video_path)

        # Extract audio using FFmpeg
        print("Extracting audio with FFmpeg...")
        subprocess.run([
            "ffmpeg", "-i", local_video_path,
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            local_audio_path, "-y"
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        start_time = time.time()
        
        # 1. Transcribe with WhisperX (faster-whisper large-v3)
        print("Loading WhisperX transcription model...")
        device = "cuda"
        compute_type = "float16"
        model = whisperx.load_model("large-v3", device, compute_type=compute_type)
        
        print("Transcribing audio...")
        audio = whisperx.load_audio(local_audio_path)
        result = model.transcribe(audio, batch_size=16)
        
        language = result.get("language", "en")
        print(f"ASR complete. Detected language: {language}")

        # 2. Align output with IndicWav2Vec (MIT licensed) for Indic scripts, or default for other languages
        print("Aligning transcripts for precise word boundaries...")
        align_model_name = None
        # Use MIT-licensed IndicWav2Vec for Dravidian languages and Hindi
        if language in ["te", "ta", "kn", "ml", "hi"]:
            align_model_name = "ai4bharat/indicwav2vec-mono-in"
            print(f"Selected MIT-licensed IndicWav2Vec aligner: {align_model_name}")

        try:
            align_model, metadata = whisperx.load_align_model(
                language_code=language,
                device=device,
                model_name=align_model_name
            )
            result = whisperx.align(
                result["segments"],
                align_model,
                metadata,
                audio,
                device,
                return_char_alignments=False
            )
            print("Phonetic forced alignment successful.")
        except Exception as ae:
            print(f"Forced alignment failed: {ae}. Falling back to default Whisper timestamps.")

        # 3. Pyannote Diarization (MIT licensed)
        hf_token = os.environ.get("HF_TOKEN")
        has_diarization = False
        if hf_token:
            try:
                print("Running speaker diarization...")
                diarize_model = whisperx.DiarizationPipeline(use_auth_token=hf_token, device=device)
                diarize_segments = diarize_model(audio)
                result = whisperx.assign_word_speakers(diarize_segments, result)
                has_diarization = True
                print("Speaker diarization and mapping complete.")
            except Exception as de:
                print(f"Diarization failed: {de}. Proceeding with transcription and alignment only.")
        else:
            print("HF_TOKEN env var not found. Skipping speaker diarization.")

        transcription_time = time.time() - start_time
        print(f"Total pipeline execution time: {transcription_time:.2f} seconds")

        # Format outputs to match DB expectations
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
                # WhisperX words contain word, start, end, score, speaker
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
        
        # Cleanup temp files
        if os.path.exists(local_video_path): os.remove(local_video_path)
        if os.path.exists(local_audio_path): os.remove(local_audio_path)

    except Exception as e:
        error_message = str(e)
        print(f"Transcription Failed: {error_message}")
        supabase.table("projects").update({
            "status": "failed",
            "title": f"[FAILED] {error_message}"[:255]
        }).eq("id", project_id).execute()


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("vidyut-secrets")]
)
@modal.fastapi_endpoint(method="POST")
def trigger(data: dict):
    project_id = data.get("project_id")
    s3_key = data.get("s3_key")
    if not project_id or not s3_key:
        return {"error": "Missing project_id or s3_key"}, 400
    
    # Spawn background task
    process_video.spawn(project_id, s3_key)
    return {"status": "started", "project_id": project_id}
