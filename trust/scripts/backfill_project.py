import os
import sys
import re
from supabase import create_client, Client
from aksharamukha import transliterate as ak_trans
from deep_translator import GoogleTranslator

def parse_env():
    supabase_url = None
    supabase_key = None
    env_path = r"c:\Users\Kotha\Desktop\varun\vidyut\.env.local"
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("NEXT_PUBLIC_SUPABASE_URL="):
                    supabase_url = line.split("=")[1].strip('"')
                elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                    supabase_key = line.split("=")[1].strip('"')
    return supabase_url, supabase_key

def main():
    if len(sys.argv) < 2:
        print("Usage: python backfill_project.py <PROJECT_ID>")
        sys.exit(1)
        
    project_id = sys.argv[1]
    supabase_url, supabase_key = parse_env()
    
    if not supabase_url or not supabase_key:
        print("Error: Could not load Supabase credentials from .env.local")
        sys.exit(1)
        
    print(f"Connecting to Supabase: {supabase_url}")
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Fetch existing transcription
    res = supabase.table("transcriptions").select("*").eq("project_id", project_id).execute()
    if not res.data:
        print(f"Error: No transcription found for project {project_id}")
        sys.exit(1)
        
    transcription = res.data[0]
    language = transcription.get("language", "te")
    raw_segments = transcription.get("segments", [])
    raw_words = transcription.get("words", [])
    
    print(f"Found transcription record. Language: '{language}', Segments: {len(raw_segments)}, Words: {len(raw_words)}")
    
    # Reconstruct result object expected by clean_and_enhance_transcription
    segments_with_words = []
    for seg in raw_segments:
        seg_words = [w for w in raw_words if w["start"] >= seg["start"] and w["end"] <= seg["end"]]
        segments_with_words.append({
            "start": seg["start"],
            "end": seg["end"],
            "text": seg["text"],
            "speaker": seg.get("speaker"),
            "words": seg_words
        })
        
    whisperx_result = {"segments": segments_with_words}
    
    # Setup converters
    punctuation_only_pat = re.compile(r"^[.,!?;:\"'\-–—\s()\[\]{}]+$")
    hallucinated_numbering_pat = re.compile(r"^\d+\.$")
    
    script_mapping = {
        "te": "Telugu",
        "hi": "Devanagari",
        "ta": "Tamil",
        "kn": "Kannada",
        "ml": "Malayalam"
    }
    
    def strip_diacritics(text):
        mapping = {
            'ā': 'a', 'ă': 'a', 'ā̆': 'a',
            'ē': 'e', 'ĕ': 'e', 'ě': 'e',
            'ī': 'i', 'ĭ': 'i',
            'ō': 'o', 'ŏ': 'o', 'ǒ': 'o',
            'ū': 'u', 'ŭ': 'u',
            'ṭ': 't', 'ḍ': 'd', 'ṇ': 'n', 'ṅ': 'n', 'ñ': 'n',
            'ś': 'sh', 'ṣ': 'sh', 'ḥ': 'h', 'ṃ': 'm', 'ṛ': 'r',
            'ḻ': 'l', 'ṟ': 'r', 'ṯ': 't',
            'Ā': 'A', 'Ē': 'E', 'Ī': 'I', 'Ō': 'O', 'Ū': 'U',
            'Ṭ': 'T', 'Ḍ': 'D', 'Ṇ': 'N', 'Ṅ': 'N', 'Ñ': 'N',
            'Ś': 'Sh', 'Ṣ': 'Sh', 'Ḥ': 'H', 'Ṃ': 'M', 'Ṛ': 'R',
            'Ḻ': 'L', 'Ṟ': 'R', 'Ṯ': 'T'
        }
        for char, replacement in mapping.items():
            text = text.replace(char, replacement)
        return text

    def romanize(text, lang):
        if lang not in script_mapping:
            return text
        try:
            iast = ak_trans.process(script_mapping[lang], 'IAST', text)
            clean = strip_diacritics(iast)
            return " ".join([w.capitalize() for w in clean.split()])
        except Exception as e:
            return text

    def translate_text(text, lang):
        if lang == "en":
            return text
        try:
            return GoogleTranslator(source=lang, target='en').translate(text)
        except Exception as e:
            return text

    print("Generating parallel scripts and applying cleanup filters...")
    cleaned_segments = []
    
    for seg in whisperx_result.get("segments", []):
        text = seg.get("text", "").strip()
        if not text:
            continue
        if punctuation_only_pat.match(text):
            continue
        if hallucinated_numbering_pat.match(text):
            continue
            
        cleaned_words = []
        for word in seg.get("words", []):
            w_text = word.get("word", "").strip()
            if w_text and not punctuation_only_pat.match(w_text) and not hallucinated_numbering_pat.match(w_text):
                cleaned_words.append({
                    "start": word.get("start", 0.0),
                    "end": word.get("end", 0.0),
                    "word": w_text,
                    "transliterated_word": romanize(w_text, language),
                    "translated_word": translate_text(w_text, language),
                    "probability": word.get("probability", 1.0),
                    "speaker": word.get("speaker", None)
                })
        
        if seg.get("words", []) and not cleaned_words:
            continue
            
        seg_translit = romanize(text, language)
        seg_translated = translate_text(text, language)
        
        cleaned_segments.append({
            "start": seg.get("start", 0.0),
            "end": seg.get("end", 0.0),
            "text": text,
            "transliterated_text": seg_translit,
            "translated_text": seg_translated,
            "speaker": seg.get("speaker", None),
            "words": cleaned_words
        })

    # Prepare DB lists
    all_segments = []
    all_words = []
    all_translit_segments = []
    all_translit_words = []
    all_translated_segments = []
    all_translated_words = []
    
    for idx, segment in enumerate(cleaned_segments):
        all_segments.append({
            "id": idx,
            "start": segment["start"],
            "end": segment["end"],
            "text": segment["text"],
            "speaker": segment["speaker"]
        })
        all_translit_segments.append({
            "id": idx,
            "start": segment["start"],
            "end": segment["end"],
            "text": segment["transliterated_text"],
            "speaker": segment["speaker"]
        })
        all_translated_segments.append({
            "id": idx,
            "start": segment["start"],
            "end": segment["end"],
            "text": segment["translated_text"],
            "speaker": segment["speaker"]
        })
        for word in segment["words"]:
            all_words.append({
                "start": word["start"],
                "end": word["end"],
                "word": word["word"],
                "probability": word["probability"],
                "speaker": word["speaker"]
            })
            all_translit_words.append({
                "start": word["start"],
                "end": word["end"],
                "word": word["transliterated_word"],
                "probability": word["probability"],
                "speaker": word["speaker"]
            })
            all_translated_words.append({
                "start": word["start"],
                "end": word["end"],
                "word": word["translated_word"],
                "probability": word["probability"],
                "speaker": word["speaker"]
            })

    print(f"Updating Supabase for project {project_id}...")
    supabase.table("transcriptions").update({
        "segments": all_segments,
        "words": all_words,
        "transliterated_segments": all_translit_segments,
        "transliterated_words": all_translit_words,
        "translated_segments": all_translated_segments,
        "translated_words": all_translated_words
    }).eq("project_id", project_id).execute()
    
    print(f"✅ Success! Project {project_id} backfilled. Switch script modes instantly in the editor!")

if __name__ == "__main__":
    main()
