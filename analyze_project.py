import json

with open("project_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

measurements = data.get('export_measurements')
transcription = data.get('transcription')

if not measurements:
    print("NO MEASUREMENTS FOUND in project!")
else:
    print("Measurements found:", list(measurements.keys()))
    layouts = measurements.get('layouts')
    if layouts:
        print(f"Number of layouts: {len(layouts)}")
    else:
        print("NO LAYOUTS FOUND!")

if not transcription:
    print("NO TRANSCRIPTION FOUND in project!")
else:
    segments = transcription.get('segments', [])
    print(f"Number of segments: {len(segments)}")
    
    if measurements and layouts:
        for i, seg in enumerate(segments):
            word_count = len(seg.get('words', []))
            layout_word_count = len(layouts[i].get('words', [])) if i < len(layouts) else 0
            if word_count != layout_word_count:
                print(f"Mismatch in seg {i}: word_count={word_count}, layout_word_count={layout_word_count}")
                print(f"  Segment words: {seg.get('words')}")
                if i < len(layouts):
                    print(f"  Layout words: {layouts[i].get('words')}")
