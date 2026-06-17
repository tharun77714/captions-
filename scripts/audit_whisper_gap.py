import os
import modal
import json
import time
import re

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
        "pyannote.audio",
        "aksharamukha",
        "deep-translator"
    )
)

app = modal.App(name="vidyut-audit")

@app.function(
    image=image,
    gpu="A10G",
    timeout=1800,
    secrets=[modal.Secret.from_name("vidyut-secrets")]
)
def audit_video(project_id: str, s3_key: str):
    import boto3
    import whisperx
    import subprocess
    
    print(f"Starting audit for project {project_id}")
    
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
    
    print(f"Downloading {s3_key}...")
    s3.download_file(bucket_name, s3_key, local_video_path)
    
    subprocess.run([
        "ffmpeg", "-i", local_video_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        local_audio_path, "-y"
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    print("Loading WhisperX...")
    device = "cuda"
    compute_type = "float16"
    model = whisperx.load_model("large-v3", device, compute_type=compute_type)
    
    audio = whisperx.load_audio(local_audio_path)
    
    print("Transcribing...")
    raw_result = model.transcribe(audio, batch_size=16)
    language = raw_result.get("language", "en")
    print(f"Language: {language}")
    
    print("Aligning...")
    align_model_name = None
    if language == "te": align_model_name = "anuragshas/wav2vec2-large-xlsr-53-telugu"
    elif language == "ta": align_model_name = "Sreerag/wav2vec2-large-xlsr-53-tamil"
    elif language == "kn": align_model_name = "anuragshas/wav2vec2-large-xlsr-53-kannada"
    elif language == "ml": align_model_name = "gvs/wav2vec2-large-xlsr-53-malayalam"
    elif language == "hi": align_model_name = "jonatasgrosman/wav2vec2-large-xlsr-53-hindi"

    aligned_result = {"segments": raw_result["segments"]}
    if align_model_name:
        try:
            align_model, metadata = whisperx.load_align_model(
                language_code=language,
                device=device,
                model_name=align_model_name
            )
            aligned_result = whisperx.align(
                raw_result["segments"], align_model, metadata, audio, device, return_char_alignments=False
            )
        except Exception as e:
            print(f"Alignment failed: {e}")
            
    print("Cleaning...")
    punctuation_only_pat = re.compile(r"^[.,!?;:\"'\-–—\s()\[\]{}]+$")
    hallucinated_numbering_pat = re.compile(r"^\d+\.$")
    
    cleaned_segments = []
    dropped_segments = []
    
    for seg in aligned_result.get("segments", []):
        text = seg.get("text", "").strip()
        
        reason = None
        if not text:
            reason = "empty_text"
        elif punctuation_only_pat.match(text):
            reason = "punctuation_only"
        elif hallucinated_numbering_pat.match(text):
            reason = "hallucinated_numbering"
            
        if reason:
            dropped_segments.append({
                "start": seg.get("start"),
                "end": seg.get("end"),
                "text": text,
                "reason": reason
            })
            continue
            
        cleaned_words = []
        for word in seg.get("words", []):
            w_text = word.get("word", "").strip()
            if w_text and not punctuation_only_pat.match(w_text) and not hallucinated_numbering_pat.match(w_text):
                cleaned_words.append(word)
                
        if seg.get("words", []) and not cleaned_words:
            dropped_segments.append({
                "start": seg.get("start"),
                "end": seg.get("end"),
                "text": text,
                "reason": "all_words_dropped"
            })
            continue
            
        cleaned_segments.append(seg)
        
    return {
        "raw_segments": raw_result["segments"],
        "aligned_segments": aligned_result.get("segments", []),
        "cleaned_segments": cleaned_segments,
        "dropped_segments": dropped_segments
    }

@app.local_entrypoint()
def main():
    project_id = "83c79ea6-44d6-46b4-996e-72335b1c7c50" # E-brands Telugu Video with massive gaps
    # Let's try to get the s3_key. Actually I'll use the user ID from the past log: anon_user/64ab519a-379d-444c-88ec-368eb97bb78a/raw.mp4
    s3_key = "anon_user/64ab519a-379d-444c-88ec-368eb97bb78a/raw.mp4"
    print("Starting Modal execution...")
    result = audit_video.remote(project_id, s3_key)
    
    with open("audit_results.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print("Done. Saved to audit_results.json")
