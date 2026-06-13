import json
from datetime import timedelta

def css_to_ass_color(css_color):
    if css_color.startswith('#'):
        css_color = css_color.lstrip('#')
        if len(css_color) == 6:
            r, g, b = css_color[0:2], css_color[2:4], css_color[4:6]
            return f"&H00{b}{g}{r}"
        elif len(css_color) == 8:
            r, g, b, a = css_color[0:2], css_color[2:4], css_color[4:6], css_color[6:8]
            alpha_int = 255 - int(a, 16)
            return f"&H{alpha_int:02X}{b}{g}{r}"
    elif css_color.startswith('rgba'):
        parts = css_color.replace('rgba(', '').replace(')', '').split(',')
        if len(parts) == 4:
            r, g, b = int(parts[0].strip()), int(parts[1].strip()), int(parts[2].strip())
            a = float(parts[3].strip())
            alpha_int = int((1.0 - a) * 255)
            return f"&H{alpha_int:02X}{b:02X}{g:02X}{r:02X}"
    return "&H00FFFFFF" 

def format_ass_time(seconds):
    td = timedelta(seconds=seconds)
    hours, remainder = divmod(td.seconds, 3600)
    minutes, seconds_int = divmod(remainder, 60)
    milliseconds = round(td.microseconds / 10000)
    return f"{hours}:{minutes:02}:{seconds_int:02}.{milliseconds:02}"

def generate_ass(segments, style, output_path, video_width, video_height):
    font_name = style.get('fontFamily', 'Inter')
    font_size = style.get('fontSize', 64)
    primary_col = css_to_ass_color(style.get('textColor', '#FFFFFF'))
    back_col = css_to_ass_color(style.get('backgroundColor', 'rgba(0,0,0,0.75)'))
    stroke_col = css_to_ass_color(style.get('strokeColor', '#000000'))
    shadow_col = css_to_ass_color(style.get('shadowColor', 'rgba(0,0,0,0.5)'))
    
    bold = '-1' if style.get('fontWeight', 700) >= 700 else '0'
    stroke_width = style.get('strokeWidth', 0)
    shadow_blur = style.get('shadowBlur', 0)
    
    border_style = 3 if 'rgba(0, 0, 0, 0)' not in style.get('backgroundColor', '') and style.get('backgroundColor') != 'transparent' else 1

    pos = style.get('position', 'bottom')
    align = style.get('alignment', 'center')
    
    if pos == 'top': alignment = 7 if align == 'left' else (9 if align == 'right' else 8)
    elif pos == 'center': alignment = 4 if align == 'left' else (6 if align == 'right' else 5)
    else: alignment = 1 if align == 'left' else (3 if align == 'right' else 2)

    highlight_mode = style.get('highlightMode', 'karaoke')

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}
WrapStyle: 1
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_col},&H000000FF,{stroke_col},{back_col},{bold},0,0,0,100,100,0,0,{border_style},{stroke_width},{shadow_blur},{alignment},40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(header)
        for seg in segments:
            words = seg.get('words', [])
            if not words or highlight_mode == 'none':
                start = format_ass_time(seg['start'])
                end = format_ass_time(seg['end'])
                f.write(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{seg['text']}\n")
            else:
                for i, w in enumerate(words):
                    start = format_ass_time(w['start'])
                    end_time_val = words[i+1]['start'] if i + 1 < len(words) else seg['end']
                    end = format_ass_time(end_time_val)
                    line_text = ""
                    for j, line_word in enumerate(words):
                        if j == i:
                            line_text += f"{{\\c&H0015CCFA&}}{line_word['word'].strip()}{{\\c}}"
                        else:
                            line_text += line_word['word'].strip()
                        if j < len(words) - 1:
                            line_text += " "
                    f.write(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{line_text}\n")

segments = [
    {
        "id": 1,
        "start": 0.0,
        "end": 2.5,
        "text": "Hello world this is a test.\nLine breaks are cool.",
        "words": [
            {"start": 0.0, "end": 0.5, "word": "Hello"},
            {"start": 0.5, "end": 1.0, "word": "world"},
            {"start": 1.0, "end": 1.2, "word": "this"},
            {"start": 1.2, "end": 1.5, "word": "is"},
            {"start": 1.5, "end": 1.6, "word": "a"},
            {"start": 1.6, "end": 2.0, "word": "test.\nLine"},
            {"start": 2.0, "end": 2.2, "word": "breaks"},
            {"start": 2.2, "end": 2.3, "word": "are"},
            {"start": 2.3, "end": 2.5, "word": "cool."}
        ]
    }
]

style = {
    "fontFamily": "Roboto",
    "fontSize": 48,
    "textColor": "#FFFFFF",
    "backgroundColor": "rgba(0,0,0,0.5)",
    "strokeColor": "#000000",
    "strokeWidth": 2,
    "shadowBlur": 4,
    "fontWeight": 800,
    "position": "center",
    "alignment": "center",
    "highlightMode": "karaoke"
}

generate_ass(segments, style, "test.ass", 1920, 1080)
print(open("test.ass").read())
