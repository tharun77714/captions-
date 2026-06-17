import json
import asyncio
from modal.export import render_video

payload = {
  "containerWidth": 357.75,
  "containerHeight": 636,
  "videoWidth": 720,
  "videoHeight": 1280,
  "scaleFactor": 2.0125786163522013,
  "fontSize": 30,
  "lineHeight": 36,
  "paddingTop": 6,
  "paddingBottom": 6,
  "paddingLeft": 12,
  "paddingRight": 12,
  "maxWidth": 100,
  "bottomOffset": 94.28125,
  "fontFamily": "Roboto",
  "fontWeight": 700,
  "textColor": "#FFFFFF",
  "backgroundColor": "rgba(0,0,0,0)",
  "strokeColor": "#000000",
  "strokeWidth": 0,
  "shadowColor": "rgba(0, 0, 0, 0.7)",
  "shadowBlur": 8,
  "shadowOffsetX": 1,
  "shadowOffsetY": 2,
  "alignment": "center",
  "position": "top",
  "positionX": -1.3073423373624213,
  "positionY": 26.686969493170203,
  "highlightMode": "color",
  "activeWordColor": "#d26060",
  "inactiveOpacity": 0.5,
  "letterSpacing": 1,
  "wordSpacing": 0,
  "lineSpacing": 1.2,
  "blur": 0,
  "fontItalic": False,
  "fontUnderline": False,
  "fontTextTransform": "uppercase",
  "transition": {
    "type": "none",
    "speed": 25,
    "target": "word",
    "speedMode": "dynamic"
  },
  "borderRadius": 6,
  "layouts": [
    {
      "words": [
        {
          "word": "\u0c30\u0c40\u0c38\u0c46\u0c02\u0c1f\u0c4d",
          "x": 61.70843505859375,
          "y": 324,
          "w": 90.4375,
          "h": 36
        }
      ],
      "box": {
        "x": 19.322998046875,
        "y": 318,
        "w": 304.0833435058594,
        "h": 84
      }
    }
  ]
}

print("Running local test...")
# render_video(project_id: str, s3_key: str, measurements: dict = None, subtitle_mode: str = "original", resolved_styles: dict = None)
render_video.local("test_proj", "anon_user/ccda8bce-2919-4508-870c-1556c9e813b6/raw.mp4", payload, "original", {})
