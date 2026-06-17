import os
import json
import time
import requests

# Ensure dependencies are installed
# pip install deepgram-sdk google-genai elevenlabs faster-whisper

def load_audio(file_path):
    with open(file_path, "rb") as f:
        return f.read()

def benchmark_raw_whisper(file_path):
    print(f"  [Exp A] Running Raw Whisper (Local)...")
    try:
        from faster_whisper import WhisperModel
        start = time.time()
        model = WhisperModel("large-v3", device="cuda", compute_type="float16")
        segments, info = model.transcribe(file_path, beam_size=5)
        text = " ".join([seg.text for seg in segments])
        return {"text": text, "time_ms": (time.time() - start) * 1000, "error": None}
    except Exception as e:
        return {"text": None, "error": str(e)}

def benchmark_current_pipeline(file_path):
    # This requires running the Modal worker logic. For local benchmarking, 
    # we would simulate or call the Modal webhook directly if deployed.
    print(f"  [Exp B] Running Current Production Pipeline (Requires Modal)...")
    return {"text": "Requires Modal trigger", "error": "Not implemented locally"}

def benchmark_deepgram(file_path):
    print(f"  [Exp C] Running Deepgram Nova-3...")
    dg_key = os.getenv("DEEPGRAM_API_KEY")
    if not dg_key:
        return {"text": None, "error": "DEEPGRAM_API_KEY not set"}
    
    start = time.time()
    headers = {"Authorization": f"Token {dg_key}", "Content-Type": "audio/wav"}
    # Using REST API for simplicity in benchmark
    url = "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true&detect_language=true"
    
    try:
        response = requests.post(url, headers=headers, data=load_audio(file_path))
        data = response.json()
        if "results" in data:
            transcript = data["results"]["channels"][0]["alternatives"][0]["transcript"]
            return {"text": transcript, "time_ms": (time.time() - start) * 1000, "error": None}
        else:
            return {"text": None, "error": str(data)}
    except Exception as e:
        return {"text": None, "error": str(e)}

def benchmark_elevenlabs(file_path):
    print(f"  [Exp D] Running ElevenLabs Scribe...")
    el_key = os.getenv("ELEVENLABS_API_KEY")
    if not el_key:
        return {"text": None, "error": "ELEVENLABS_API_KEY not set"}
    
    # ElevenLabs Scribe API endpoint
    url = "https://api.elevenlabs.io/v1/speech-to-text"
    headers = {"xi-api-key": el_key}
    
    try:
        start = time.time()
        with open(file_path, "rb") as f:
            files = {"file": f}
            response = requests.post(url, headers=headers, files=files)
            data = response.json()
            return {"text": data.get("text"), "time_ms": (time.time() - start) * 1000, "error": None}
    except Exception as e:
         return {"text": None, "error": str(e)}

def benchmark_gemini(file_path):
    print(f"  [Exp E] Running Gemini 1.5 Pro Audio...")
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        return {"text": None, "error": "GEMINI_API_KEY not set"}
    
    try:
        start = time.time()
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        
        # Note: In a real run, upload file using genai.upload_file first
        uploaded_file = genai.upload_file(path=file_path)
        model = genai.GenerativeModel(model_name="gemini-1.5-pro")
        prompt = "Transcribe the audio exactly. Output the text in the language spoken. If code-switching, preserve both languages."
        response = model.generate_content([prompt, uploaded_file])
        
        return {"text": response.text, "time_ms": (time.time() - start) * 1000, "error": None}
    except Exception as e:
         return {"text": None, "error": str(e)}

def run_benchmarks():
    dataset_dir = "benchmark_data"
    if not os.path.exists(dataset_dir):
        print(f"Directory {dataset_dir} not found. Please place the 10 test audio files in {dataset_dir}/")
        return

    files = [os.path.join(dataset_dir, f) for f in os.listdir(dataset_dir) if f.endswith(".wav") or f.endswith(".mp4")]
    if not files:
        print(f"No audio files found in {dataset_dir}/. Add files to begin.")
        return

    results = {}
    for idx, file_path in enumerate(files):
        print(f"\nProcessing File {idx+1}/{len(files)}: {os.path.basename(file_path)}")
        results[file_path] = {
            "Experiment_A_RawWhisper": benchmark_raw_whisper(file_path),
            "Experiment_C_Deepgram": benchmark_deepgram(file_path),
            "Experiment_D_ElevenLabs": benchmark_elevenlabs(file_path),
            "Experiment_E_Gemini": benchmark_gemini(file_path)
        }

    with open("benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
        
    print("\n✅ Benchmarks complete. Results saved to benchmark_results.json")

if __name__ == "__main__":
    run_benchmarks()
