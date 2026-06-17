import os
import json
import importlib.util

spec = importlib.util.spec_from_file_location("export_module", "modal/export.py")
export_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(export_module)

def test_export():
    payload = {
        "video_width": 1080,
        "video_height": 1920,
        "style": {
            "font": {"family": "Inter", "weight": "800"},
            "fontSize": 24,
            "backgroundColor": "rgba(0, 0, 0, 0.75)",
            "textColor": "#ffffff",
            "paddingTop": 6,
            "paddingLeft": 12,
            "borderRadius": 6,
            "alignment": "center",
            "position": "bottom"
        },
        "measurements": {
            "layouts": [
                {
                    "words": [
                        {"word": "Test", "x": 100, "y": 1000, "w": 50, "h": 20},
                        {"word": "word", "x": 160, "y": 1000, "w": 50, "h": 20}
                    ],
                    "lines": [
                        {
                            "words": [
                                {"word": "Test", "x": 100, "y": 1000, "w": 50, "h": 20},
                                {"word": "word", "x": 160, "y": 1000, "w": 50, "h": 20}
                            ],
                            "box": {"x": 100, "y": 1000, "w": 110, "h": 20},
                            "paddingX": 36,
                            "paddingY": 18,
                            "borderRadius": 18
                        }
                    ]
                }
            ]
        },
        "segments": [
            {
                "start": 0.0,
                "end": 2.0,
                "text": "Test word",
                "words": [
                    {"word": "Test", "start": 0.0, "end": 1.0},
                    {"word": "word", "start": 1.0, "end": 2.0}
                ]
            }
        ]
    }
    
    with open("test_payload.json", "w") as f:
        json.dump(payload, f)
        
    ass_path = "test_output.ass"
    
    export_module.generate_ass(
        payload["segments"], 
        payload["style"], 
        ass_path, 
        payload["video_width"], 
        payload["video_height"], 
        payload["measurements"]
    )
    
    print("SUCCESS")
    with open(ass_path, "r", encoding="utf-8") as f:
        for line in f.readlines():
            if "Dialogue: 0" in line:
                print(line.strip())

if __name__ == '__main__':
    test_export()
