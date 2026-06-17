import json
import re

# Simulate the exact logic from modal/transcribe.py
def romanize_mock(text, lang="te"):
    try:
        from aksharamukha import transliterate as ak_trans
        
        script_mapping = {
            "te": "Telugu",
            "ta": "Tamil",
            "kn": "Kannada",
            "ml": "Malayalam",
            "hi": "Devanagari"
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

        if lang not in script_mapping:
            return text
            
        iast = ak_trans.process(script_mapping[lang], 'IAST', text)
        clean = strip_diacritics(iast)
        return " ".join([w.capitalize() for w in clean.split()])
    except ImportError:
        return "[Error: aksharamukha not installed in this environment]"
    except Exception as e:
        return f"[Error: {str(e)}]"

def run_simulation():
    print("--- ROOT CAUSE ISOLATION SIMULATION ---")
    print("Simulating the current pipeline's transliteration step.\n")
    
    test_cases = [
        {"desc": "Pure Telugu", "text": "ఎలా ఉన్నావు"},
        {"desc": "English forced to Telugu script (Script Collapse)", "text": "స్కిన్ కేర్"}, # "Skin care"
        {"desc": "English brand name forced to Telugu script", "text": "నైకీ"}, # "Nike"
        {"desc": "Tanglish/Slang", "text": "బాగున్నావా బ్రో"}, # "Bagunnava bro"
        {"desc": "Pure Tamil", "text": "வணக்கம்"},
    ]
    
    for case in test_cases:
        print(f"Test Case: {case['desc']}")
        print(f"Raw ASR Output (Native): {case['text']}")
        
        # Determine lang based on script (rough approximation for simulation)
        lang = "te" if " " in case['text'] or case['text'].startswith("ఎ") or case['text'].startswith("స్కి") or case['text'].startswith("నై") or case['text'].startswith("బా") else "ta"
        
        transliterated = romanize_mock(case['text'], lang=lang)
        print(f"Final Transliteration:   {transliterated}\n")
        
if __name__ == "__main__":
    run_simulation()
