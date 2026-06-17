import sys
import subprocess

# Auto install deep-translator
try:
    import deep_translator
except ImportError:
    print("Installing deep-translator...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "deep-translator"])

from aksharamukha import transliterate as ak_trans
from deep_translator import GoogleTranslator

test_cases = {
    "Telugu": ("ఎలా ఉన్నావు", "Telugu", "te"),
    "Hindi": ("कैसे हो", "Devanagari", "hi"),
    "Tamil": ("எப்படி இருக்கீங்க", "Tamil", "ta"),
    "Kannada": ("ಹೇಗಿದ್ದೀರಾ", "Kannada", "kn"),
    "Malayalam": ("സുഖമാണോ", "Malayalam", "ml")
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

output = []
for lang, (text, src_script, lang_code) in test_cases.items():
    # Transliterate
    iast_val = ak_trans.process(src_script, 'IAST', text)
    clean_val = strip_diacritics(iast_val)
    capitalized = " ".join([w.capitalize() for w in clean_val.split()])
    
    # Translate
    try:
        translated = GoogleTranslator(source=lang_code, target='en').translate(text)
    except Exception as e:
        translated = f"Error: {e}"
        
    output.append(f"{lang} -> Raw: '{text}' | Translit: '{capitalized}' | Translate: '{translated}'")

with open("trust/scratch/translit_output.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output))
print("Done!")
