import json
try:
    with open('project_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        layouts = data.get('export_measurements', {}).get('layouts', [])
        if layouts and len(layouts) > 0:
            layout = layouts[0]
            words = layout.get('words', [])
            for w in words:
                print(f"word: {w.get('word')}, y: {w.get('y')}")
        else:
            print("No layouts")
except Exception as e:
    print(e)
