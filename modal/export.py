import os
import modal
import subprocess
import time
import json
import urllib.parse
from datetime import timedelta

image = (
    modal.Image.from_registry("nvidia/cuda:12.2.2-cudnn8-runtime-ubuntu22.04", add_python="3.11")
    .apt_install("ffmpeg", "fonts-noto", "fonts-noto-cjk", "fonts-indic")
    .pip_install("supabase==2.4.5", "boto3==1.34.101", "requests")
    .pip_install("fastapi[standard]")
)

app = modal.App(name="vidyut-exporter")

def css_to_ass_color(css_color):
    """
    Converts CSS colors (hex or rgba) to ASS color format: &HAABBGGRR
    ASS alpha: 00 is opaque, FF is transparent.
    """
    if isinstance(css_color, dict):
        css_color = css_color.get('value', css_color.get('color', '#FFFFFF'))
        
    if not isinstance(css_color, str):
        css_color = str(css_color)
        
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
    return "&H00FFFFFF" # Default white

def format_ass_time(seconds):
    td = timedelta(seconds=seconds)
    hours, remainder = divmod(td.seconds, 3600)
    minutes, seconds_int = divmod(remainder, 60)
    milliseconds = round(td.microseconds / 10000) # 2 digits for ASS (cs)
    return f"{hours}:{minutes:02}:{seconds_int:02}.{milliseconds:02}"

def download_google_font(font_name: str) -> str:
    import urllib.request
    import urllib.parse
    import os
    import re
    import shutil
    import subprocess
    
    font_dir = "/usr/share/fonts/custom"
    os.makedirs(font_dir, exist_ok=True)
    
    safe_name = font_name.replace(" ", "")
    ttf_path = os.path.join(font_dir, f"{safe_name}.ttf")
    
    # Check if we've already downloaded at least one TTF for this font
    font_files = [f for f in os.listdir(font_dir) if f.startswith(safe_name) and f.endswith(".ttf")]
    if font_files:
        return font_dir
        
    print(f"Downloading {font_name} via Google Fonts CSS parser...")
    try:
        # Requesting with 'curl' User-Agent forces Google Fonts to return pure .ttf links instead of .woff/.woff2
        url = f"https://fonts.googleapis.com/css2?family={urllib.parse.quote(font_name)}:wght@300;400;500;600;700;800;900&display=swap"
        
        req = urllib.request.Request(url, headers={'User-Agent': 'curl/7.68.0'})
        with urllib.request.urlopen(req) as response:
            css = response.read().decode('utf-8')
            
        weights = [300, 400, 500, 600, 700, 800, 900]
        downloaded = 0
        for w in weights:
            # Match font-weight and src URL
            pattern = f"font-weight:\\s*{w};.*?src:\\s*url\\((https://[^)]+)\\)"
            match = re.search(pattern, css, re.DOTALL | re.IGNORECASE)
            if match:
                ttf_url = match.group(1)
                ttf_path_w = os.path.join(font_dir, f"{safe_name}-{w}.ttf")
                urllib.request.urlretrieve(ttf_url, ttf_path_w)
                downloaded += 1
                
        if downloaded > 0:
            print(f"Successfully downloaded {downloaded} weights for font {font_name}")
            regular_path = os.path.join(font_dir, f"{safe_name}-400.ttf")
            generic_path = os.path.join(font_dir, f"{safe_name}.ttf")
            if os.path.exists(regular_path) and not os.path.exists(generic_path):
                shutil.copy(regular_path, generic_path)
            return font_dir
            
    except Exception as e:
        print(f"Failed to download font {font_name} via CSS parser: {e}")
        
    # Fallback to direct raw github download of Regular weight
    try:
        print(f"Falling back to GitHub raw download for {font_name}...")
        url = f"https://raw.githubusercontent.com/google/fonts/main/ofl/{safe_name.lower()}/{safe_name}-Regular.ttf"
        urllib.request.urlretrieve(url, ttf_path)
    except Exception as e:
        print(f"Font fallback failed: {e}")
        
    subprocess.run(["fc-cache", "-fv", font_dir], check=False)
    return font_dir

def get_video_info(file_path):
    cmd = [
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height,codec_name,color_space,color_transfer,color_primaries", 
        "-of", "json", file_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, text=True)
    info = json.loads(result.stdout)
    stream = info['streams'][0]
    return {
        'width': stream.get('width', 1920),
        'height': stream.get('height', 1080),
        'codec_name': stream.get('codec_name', 'h264'),
        'color_space': stream.get('color_space'),
        'color_transfer': stream.get('color_transfer'),
        'color_primaries': stream.get('color_primaries')
    }

def generate_ass(segments, style, output_path, video_width, video_height, measurements=None, resolved_styles=None):
    """
    Generate ASS subtitle file.
    
    If `measurements` is provided (captured from the browser DOM), we use
    the exact scale factor (nativeVideoHeight / browserContainerHeight) to 
    convert every CSS pixel value to native video pixels. No estimation.
    
    If `measurements` is not provided (legacy fallback), we estimate using
    a reference height. This path should be avoided.
    """
    font_name = (measurements or {}).get('fontFamily') or style.get('fontFamily', 'Inter')
    
    # ═══════════════════════════════════════════════════════════════════
    # SCALE FACTOR COMPUTATION
    # ═══════════════════════════════════════════════════════════════════
    video_height = float(video_height)
    video_width = float(video_width)
    
    if measurements:
        # EXACT PATH: Use actual browser-measured values
        scale = measurements.get('scaleFactor', video_height / 644.0)
        css_font_size = measurements.get('fontSize', style.get('fontSize', 24))
        css_padding_x = measurements.get('paddingLeft', 12)
        css_padding_y = measurements.get('paddingTop', 6)
        css_bottom_offset = measurements.get('bottomOffset', 64)
        css_container_width = measurements.get('containerWidth', 362)
        css_container_height = measurements.get('containerHeight', 644)
        css_max_width = measurements.get('maxWidth', css_container_width * 0.85)
        css_line_height = measurements.get('lineHeight', css_font_size * 1.375)
        
        print(f"[PARITY] Using browser measurements:")
        print(f"  containerSize: {css_container_width}x{css_container_height}")
        print(f"  videoSize: {video_width}x{video_height}")
        print(f"  scaleFactor: {scale}")
        print(f"  cssFontSize: {css_font_size}px -> ASS: {css_font_size * scale}px")
        print(f"  cssPadding: x={css_padding_x}px y={css_padding_y}px")
        print(f"  cssBottomOffset: {css_bottom_offset}px -> ASS: {css_bottom_offset * scale}px")
        print(f"  cssLineHeight: {css_line_height}px")
    else:
        # FALLBACK: No measurements available (legacy export or API call without browser)
        # This path produces approximate results
        print("[PARITY] WARNING: No browser measurements. Using fallback estimation.")
        css_font_size = style.get('fontSize', 24)
        # Estimate: assume a typical browser container height
        # For a 720x1280 video, container is approximately 644px tall
        estimated_container_h = video_height * 0.503  # approximate browser scaling
        scale = video_height / estimated_container_h
        css_padding_x = 12
        css_padding_y = 6
        css_bottom_offset = 64
        css_container_width = video_width * 0.503
        css_max_width = css_container_width * 0.85
        css_line_height = css_font_size * 1.375

    # ═══════════════════════════════════════════════════════════════════
    # CONVERT CSS PIXELS TO NATIVE VIDEO PIXELS
    # ═══════════════════════════════════════════════════════════════════
    # PlayRes = native video resolution. 1 ASS unit = 1 native pixel.
    play_res_x = video_width
    play_res_y = video_height
    
    # Font size: CSS px * scale = native video px
    font_size = int(round(css_font_size * scale))
    
    # Padding: for ASS BorderStyle=3, Outline is the box padding (symmetric)
    # CSS has asymmetric padding (px-3=12, py-1.5=6). ASS is symmetric.
    # Use average to minimize visible difference: (12+6)/2 = 9
    outline_padding = int(round((css_padding_x + css_padding_y) / 2.0 * scale))
    
    # Margins
    margin_y = int(round(css_bottom_offset * scale))
    # Horizontal margin: CSS has padding:0 24px on outer div + max-w-85%
    # This means the subtitle box is centered with max 85% width
    # ASS MarginL/R restricts the line box width
    margin_x = int(round(video_width * (1.0 - 0.85) / 2.0))
    
    stroke_width = int(round(style.get('strokeWidth', 0) * scale))
    
    shadow_blur_css = measurements.get('shadowBlur', style.get('shadowBlur', 0)) if measurements else style.get('shadowBlur', 0)
    shadow_x_css = measurements.get('shadowOffsetX', style.get('shadow', {}).get('offsetX', 0)) if measurements else style.get('shadow', {}).get('offsetX', 0)
    shadow_y_css = measurements.get('shadowOffsetY', style.get('shadow', {}).get('offsetY', 0)) if measurements else style.get('shadow', {}).get('offsetY', 0)
    
    shadow_blur = int(round(shadow_blur_css * scale))
    shadow_x = int(round(shadow_x_css * scale))
    shadow_y = int(round(shadow_y_css * scale))

    primary_col = css_to_ass_color((measurements or {}).get('textColor', style.get('textColor', '#FFFFFF')))
    back_col = css_to_ass_color((measurements or {}).get('backgroundColor', style.get('backgroundColor', 'rgba(0,0,0,0.75)')))
    stroke_col = css_to_ass_color((measurements or {}).get('strokeColor', style.get('strokeColor', '#000000')))
    shadow_col = css_to_ass_color((measurements or {}).get('shadowColor', style.get('shadowColor', 'rgba(0,0,0,0.5)')))
    
    font_weight_css = (measurements or {}).get('fontWeight', style.get('fontWeight', 700))
    bold = '-1' if int(font_weight_css) >= 700 else '0'
    italic_css = measurements.get('fontItalic', style.get('font', {}).get('italic', False)) if measurements else style.get('font', {}).get('italic', False)
    underline_css = measurements.get('fontUnderline', style.get('font', {}).get('underline', False)) if measurements else style.get('font', {}).get('underline', False)
    text_transform = measurements.get('fontTextTransform', style.get('font', {}).get('textTransform', 'none')) if measurements else style.get('font', {}).get('textTransform', 'none')
    
    italic = '-1' if italic_css else '0'
    underline_ass = '-1' if underline_css else '0'
    
    # BorderStyle: 1=Outline+DropShadow
    # We will ALWAYS use 1 for the text style, because the box is drawn separately.
    border_style = 1

    outline_color_ass = stroke_col
    back_color_ass = shadow_col
    outline_size_ass = stroke_width
    shadow_size_ass = 0  # We will apply \xshad and \yshad per word to allow asymmetric shadows

    pos = style.get('position', 'bottom')
    align = style.get('alignment', 'center')
    
    if pos == 'top': alignment = 7 if align == 'left' else (9 if align == 'right' else 8)
    elif pos == 'center': alignment = 4 if align == 'left' else (6 if align == 'right' else 5)
    else: alignment = 1 if align == 'left' else (3 if align == 'right' else 2)

    # For top position, use the top margin instead
    if pos == 'top':
        margin_y = int(round(32 * scale))  # CSS top-8 = 32px
    elif pos == 'center':
        margin_y = 0  # Centered vertically

    highlight_mode = measurements.get('highlightMode', style.get('highlightMode', 'none')) if measurements else style.get('highlightMode', 'none')
    
    letter_spacing_css = measurements.get('letterSpacing', style.get('letterSpacing', 0)) if measurements else style.get('letterSpacing', 0)
    ass_fsp = round(letter_spacing_css * scale, 2)
    
    active_word_color = measurements.get('activeWordColor', style.get('activeWordColor', '#facc15')) if measurements else style.get('activeWordColor', '#facc15')
    ass_active_color = css_to_ass_color(active_word_color)
    
    inactive_opacity = measurements.get('inactiveOpacity', style.get('inactiveOpacity', 0.5)) if measurements else style.get('inactiveOpacity', 0.5)
    ass_inactive_alpha = f"&H{int((1.0 - inactive_opacity) * 255):02X}&"
    
    transition = measurements.get('transition', style.get('transition', {'type': 'none', 'target': 'line', 'speed': 20, 'speedMode': 'dynamic'})) if measurements else style.get('transition', {'type': 'none', 'target': 'line', 'speed': 20, 'speedMode': 'dynamic'})
    trans_type = transition.get('type', 'none')
    trans_target = transition.get('target', 'line')
    trans_speed_mode = transition.get('speedMode', 'dynamic')
    trans_speed = transition.get('speed', 20)
    
    print(f"[PARITY] ASS output values:")
    print(f"  PlayRes: {play_res_x}x{play_res_y}")
    print(f"  FontSize: {font_size}")
    print(f"  Outline (stroke): {outline_size_ass}")
    print(f"  MarginV: {margin_y}")
    print(f"  MarginX: {margin_x}")
    print(f"  Bold: {bold}")

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {play_res_x}
PlayResY: {play_res_y}
WrapStyle: 1
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_col},&H000000FF,{outline_color_ass},{back_color_ass},{bold},{italic},{underline_ass},0,100,100,0,0,{border_style},{outline_size_ass},{shadow_size_ass},{alignment},{margin_x},{margin_x},{margin_y},1
Style: Background,Arial,10,{back_col},&H000000FF,{back_col},&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(header)
        
        layouts = measurements.get('layouts') if measurements else None
        # CSS border radius is 6px by default
        border_radius_css = measurements.get('borderRadius', 6) if measurements else 6
        border_radius = int(round(border_radius_css * scale))

        for s_idx, seg in enumerate(segments):
            words = seg.get('words', [])
            layout_words = layouts[s_idx]['words'] if layouts and s_idx < len(layouts) else None
            layout_box = layouts[s_idx]['box'] if layouts and 'box' in layouts[s_idx] else None
            layout_lines = layouts[s_idx].get('lines') if layouts and s_idx < len(layouts) else None

            s_ass_seg = format_ass_time(seg['start'])
            e_ass_seg = format_ass_time(seg['end'])

            has_bg = 'rgba(0, 0, 0, 0)' not in style.get('backgroundColor', '') and style.get('backgroundColor') != 'transparent'

            # ──────────────────────────────────────────────────────
            # 1. Background Box Rendering
            # ──────────────────────────────────────────────────────
            if has_bg and layout_lines:
                rendered_box_count = 0
                for line in layout_lines:
                    lb = line.get('box', {})
                    if not lb: continue
                    
                    bx = int(round((lb.get('x', 0) - line.get('paddingX', 0)) * scale))
                    by = int(round((lb.get('y', 0) - line.get('paddingY', 0)) * scale))
                    bw = int(round((lb.get('w', 0) + line.get('paddingX', 0) * 2) * scale))
                    bh = int(round((lb.get('h', 0) + line.get('paddingY', 0) * 2) * scale))
                    br = int(round(line.get('borderRadius', 0) * scale))
                    
                    if bw <= 0 or bh <= 0:
                        continue
                        
                    nx = bx + br
                    ny = by + br
                    nw = max(1, bw - br * 2)
                    nh = max(1, bh - br * 2)
                    
                    prefix = f"{{\\an7\\pos({nx},{ny})\\bord{br * 2}\\shad0\\p1}}"
                    path = f"m 0 0 l {nw} 0 l {nw} {nh} l 0 {nh}"
                    suffix = "{\\p0}"
                    f.write(f"Dialogue: 0,{s_ass_seg},{e_ass_seg},Background,,0,0,0,,{prefix}{path}{suffix}\n")
                    rendered_box_count += 1
                
                if rendered_box_count > len(layout_lines):
                    raise ValueError(f"Export safety violation: rendered_box_count ({rendered_box_count}) > line_count ({len(layout_lines)})")
            elif has_bg and layout_box:
                # Fallback to single bounding box
                bx = int(round(layout_box['x'] * scale))
                by = int(round(layout_box['y'] * scale))
                bw = int(round(layout_box['w'] * scale))
                bh = int(round(layout_box['h'] * scale))
                
                nx = bx + border_radius
                ny = by + border_radius
                nw = max(1, bw - border_radius * 2)
                nh = max(1, bh - border_radius * 2)
                
                prefix = f"{{\\an7\\pos({nx},{ny})\\bord{border_radius * 2}\\shad0\\p1}}"
                path = f"m 0 0 l {nw} 0 l {nw} {nh} l 0 {nh}"
                suffix = "{\\p0}"
                f.write(f"Dialogue: 0,{s_ass_seg},{e_ass_seg},Background,,0,0,0,,{prefix}{path}{suffix}\n")

            # ──────────────────────────────────────────────────────
            # 2. Text Rendering
            # ──────────────────────────────────────────────────────
            if not words or not layout_words or len(words) != len(layout_words):
                # Fallback if no layout or mismatch
                clean_text = seg['text'].replace('\\n', '\\N')
                f.write(f"Dialogue: 1,{s_ass_seg},{e_ass_seg},Default,,0,0,0,,{clean_text}\n")
                continue

            # ──────────────────────────────────────────────────────
            # 2. Explicit Layout Text Rendering
            # ──────────────────────────────────────────────────────
            def render_word(w_idx, start_t, end_t, active_idx):
                if start_t >= end_t: return
                s_ass = format_ass_time(start_t)
                e_ass = format_ass_time(end_t)
                
                word_obj = words[w_idx]
                layout_w = layout_words[w_idx]
                word_str = word_obj['word'].strip()
                
                is_active = (w_idx == active_idx)
                
                # Default style values
                word_primary_col = primary_col
                word_fsp = ass_fsp
                word_shadow_x = shadow_x
                word_shadow_y = shadow_y
                word_shadow_blur = shadow_blur
                word_font_size = font_size
                word_italic = italic
                word_underline = underline_ass
                word_bold = bold

                if resolved_styles and word_obj['id'] in resolved_styles:
                    rs = resolved_styles[word_obj['id']]
                    word_primary_col = css_to_ass_color(rs.get('textColor', word_primary_col))
                    word_fsp = round(rs.get('letterSpacing', 0) * scale, 2)
                    word_shadow_x = int(round(rs.get('shadowOffsetX', 0) * scale))
                    word_shadow_y = int(round(rs.get('shadowOffsetY', 0) * scale))
                    word_shadow_blur = int(round(rs.get('shadowBlur', 0) * scale))
                    word_font_size = int(round(rs.get('fontSize', 24) * scale))
                    word_italic = '-1' if rs.get('italic') else '0'
                    word_underline = '-1' if rs.get('underline') else '0'
                    word_bold = '-1' if int(rs.get('fontWeight', 700)) >= 700 else '0'
                    
                word_transform = text_transform
                if resolved_styles and word_obj['id'] in resolved_styles:
                    word_transform = rs.get('textTransform', text_transform)
                    
                if word_transform == 'uppercase': word_str = word_str.upper()
                elif word_transform == 'lowercase': word_str = word_str.lower()
                elif word_transform == 'capitalize': word_str = word_str.title()
                
                nx = int(round(layout_w['x']))
                ny = int(round(layout_w['y']))
                if resolved_styles and word_obj['id'] in resolved_styles:
                    rs = resolved_styles[word_obj['id']]
                    nx += int(round(rs.get('x', 0) * scale))
                    ny += int(round(rs.get('y', 0) * scale))
                
                base_alpha = "&H00&" if (is_active or highlight_mode == 'none') else ass_inactive_alpha
                base_c = ass_active_color if (is_active and highlight_mode in ['color', 'karaoke', 'background']) else word_primary_col
                base_scale = 115 if (is_active and highlight_mode == 'scale') else (110 if (is_active and highlight_mode == 'karaoke') else 100)
                
                tags = [f"\\an7\\pos({nx},{ny})"]
                
                # Apply word-specific overrides if they differ from global defaults
                if word_font_size != font_size: tags.append(f"\\fs{word_font_size}")
                if word_bold != bold: tags.append(f"\\b{word_bold}")
                if word_italic != italic: tags.append(f"\\i{word_italic}")
                
                if word_fsp != 0: tags.append(f"\\fsp{word_fsp}")
                
                if word_shadow_x != 0 or word_shadow_y != 0:
                    tags.append(f"\\xshad{word_shadow_x}\\yshad{word_shadow_y}")
                
                if highlight_mode != 'none':
                    tags.append(f"\\alpha{base_alpha}\\c{base_c}\\fscx{base_scale}\\fscy{base_scale}")
                    if is_active and highlight_mode == 'background':
                        tags.append("\\c&H000000FF&") # Black text over background
                    elif is_active and highlight_mode == 'underline':
                        tags.append("\\u1")
                elif word_underline == '-1':
                    tags.append("\\u1")
                
                if word_primary_col != primary_col and highlight_mode == 'none':
                    tags.append(f"\\c{word_primary_col}")
                
                if trans_type != 'none':
                    eff_start = word_obj.get('start', seg['start']) if trans_target == 'word' else seg['start']
                    if trans_speed_mode == 'fixed':
                        eff_dur = max(0, (50 - trans_speed) * 10) / 1000.0
                    else:
                        ref_dur = (word_obj.get('end', eff_start + 0.5) - eff_start) if trans_target == 'word' else (seg['end'] - seg['start'])
                        eff_dur = max(0.05, ref_dur)
                        
                    eff_end = eff_start + eff_dur
                    rel_t1 = int((eff_start - start_t) * 1000)
                    rel_t2 = int((eff_end - start_t) * 1000)
                    
                    if rel_t2 > 0 and rel_t1 < int((end_t - start_t) * 1000):
                        init_tags, target_tags = "", ""
                        if trans_type == 'fade':
                            init_tags = "\\alpha&HFF&"
                            target_tags = f"\\alpha{base_alpha}"
                        elif trans_type == 'pop':
                            init_tags = "\\fscx0\\fscy0"
                            target_tags = f"\\fscx{base_scale}\\fscy{base_scale}"
                        elif trans_type == 'slide-up':
                            tags[0] = f"\\an7\\pos({nx},{ny - int(20*scale)})"
                            target_tags = f"\\pos({nx},{ny})\\alpha{base_alpha}"
                            init_tags = "\\alpha&HFF&"
                        elif trans_type == 'slide-down':
                            tags[0] = f"\\an7\\pos({nx},{ny + int(20*scale)})"
                            target_tags = f"\\pos({nx},{ny})\\alpha{base_alpha}"
                            init_tags = "\\alpha&HFF&"
                        elif trans_type == 'slide-left':
                            tags[0] = f"\\an7\\pos({nx - int(20*scale)},{ny})"
                            target_tags = f"\\pos({nx},{ny})\\alpha{base_alpha}"
                            init_tags = "\\alpha&HFF&"
                        elif trans_type == 'slide-right':
                            tags[0] = f"\\an7\\pos({nx + int(20*scale)},{ny})"
                            target_tags = f"\\pos({nx},{ny})\\alpha{base_alpha}"
                            init_tags = "\\alpha&HFF&"
                        elif trans_type == 'zoom':
                            init_tags = "\\fscx50\\fscy50\\alpha&HFF&"
                            target_tags = f"\\fscx{base_scale}\\fscy{base_scale}\\alpha{base_alpha}"
                        elif trans_type == 'flip-x':
                            init_tags = "\\frx90\\alpha&HFF&"
                            target_tags = f"\\frx0\\alpha{base_alpha}"
                        elif trans_type == 'flip-y':
                            init_tags = "\\fry90\\alpha&HFF&"
                            target_tags = f"\\fry0\\alpha{base_alpha}"
                        elif trans_type == 'spin':
                            init_tags = "\\frz180\\fscx0\\fscy0\\alpha&HFF&"
                            target_tags = f"\\frz0\\fscx{base_scale}\\fscy{base_scale}\\alpha{base_alpha}"
                        elif trans_type == 'blur':
                            init_tags = "\\blur20\\alpha&HFF&"
                            target_tags = f"\\blur0\\alpha{base_alpha}"
                        elif trans_type in ['bounce', 'elastic']:
                            # Fallback to pop for complex easings
                            init_tags = "\\fscx0\\fscy0"
                            target_tags = f"\\fscx{base_scale}\\fscy{base_scale}"
                            
                        tags.append(init_tags)
                        tags.append(f"\\t({max(0, rel_t1)},{rel_t2},{target_tags})")
                    elif rel_t1 >= int((end_t - start_t) * 1000):
                        tags.append("\\alpha&HFF&")
                
                prefix = "{" + "".join(tags) + "}"
                suffix = ""
                if highlight_mode != 'none':
                    suffix_tags = "\\alpha&H00&\\c\\fscx100\\fscy100"
                    if is_active and highlight_mode == 'underline':
                        suffix_tags += "\\u0"
                    suffix = "{" + suffix_tags + "}"
                
                f.write(f"Dialogue: 1,{s_ass},{e_ass},Default,,0,0,0,,{prefix}{word_str}{suffix}\n")

            if highlight_mode == 'none':
                # No highlighting: just render all words for the whole segment duration
                for i in range(len(words)):
                    render_word(i, seg['start'], seg['end'], -1)
            else:
                # Karaoke: slice time
                curr_time = seg['start']
                for i, w in enumerate(words):
                    w_start = max(curr_time, w.get('start', curr_time))
                    w_end = max(w_start, w.get('end', w_start))

                    if curr_time < w_start:
                        # Gap before this word
                        for j in range(len(words)):
                            render_word(j, curr_time, w_start, -1)
                    
                    # During this word
                    for j in range(len(words)):
                        render_word(j, w_start, w_end, i)
                        
                    curr_time = w_end
                
                if curr_time < seg['end']:
                    for j in range(len(words)):
                        render_word(j, curr_time, seg['end'], -1)


@app.function(
    image=image,
    gpu="T4",
    timeout=3600,
    secrets=[modal.Secret.from_name("vidyut-secrets")]
)
def render_video(project_id: str, s3_key: str, measurements: dict = None, subtitle_mode: str = "original", resolved_styles: dict = None):
    import boto3
    from supabase import create_client, Client

    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)

    try:
        # Fetch project data
        project = supabase.table("projects").select("*").eq("id", project_id).single().execute()
        project_data = project.data
        
        # Determine columns based on subtitle_mode
        select_cols = "segments, words"
        if subtitle_mode == "transliterated":
            select_cols = "transliterated_segments, transliterated_words"
        elif subtitle_mode == "translated":
            select_cols = "translated_segments"

        transcription = supabase.table("transcriptions").select(select_cols).eq("project_id", project_id).single().execute()
        
        if subtitle_mode == "transliterated":
            raw_segments = transcription.data.get("transliterated_segments", []) or []
            raw_words = transcription.data.get("transliterated_words", []) or []
        elif subtitle_mode == "translated":
            raw_segments = transcription.data.get("translated_segments", []) or []
            raw_words = []
        else:
            raw_segments = transcription.data.get("segments", []) or []
            raw_words = transcription.data.get("words", []) or []

        # Fallback to original if selected script arrays are completely missing
        if not raw_segments and subtitle_mode != "original":
            print(f"Warning: {subtitle_mode} segments are empty. Falling back to original segments.")
            transcription = supabase.table("transcriptions").select("segments, words").eq("project_id", project_id).single().execute()
            raw_segments = transcription.data.get("segments", []) or []
            raw_words = transcription.data.get("words", []) or []

        # Map flat words to segments hierarchically if not already nested
        segments = []
        for seg in raw_segments:
            seg_copy = dict(seg)
            if 'words' not in seg_copy or not seg_copy['words']:
                seg_words = [
                    w for w in raw_words
                    if w.get('start', 0.0) >= seg_copy['start'] - 0.05
                    and w.get('end', 0.0) <= seg_copy['end'] + 0.05
                ]
                seg_copy['words'] = seg_words
            segments.append(seg_copy)
        
        # Load style
        style = project_data.get("subtitle_style", {})

        # Setup R2
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
        local_subs_path = f"/tmp/{project_id}_subs.ass"
        local_output_path = f"/tmp/{project_id}_final.mp4"
        
        print(f"Downloading {s3_key} from R2...")
        s3.download_file(bucket_name, s3_key, local_video_path)

        video_info = get_video_info(local_video_path)
        width, height = video_info['width'], video_info['height']
        print(f"Video info: {width}x{height}, Codec: {video_info['codec_name']}")
        
        if measurements:
            print(f"Browser measurements received: {json.dumps(measurements, indent=2)}")
        else:
            print("WARNING: No browser measurements received. Using fallback estimation.")

        # Font downloading
        font_name = (measurements or {}).get('fontFamily') or style.get('fontFamily', 'Inter')
        font_dir = download_google_font(font_name)

        generate_ass(segments, style, local_subs_path, width, height, measurements, resolved_styles)
        
        # Print the generated ASS for verification
        with open(local_subs_path, 'r') as f:
            print("Generated ASS:\n" + f.read()[:3000])
        
        print("Rendering video with FFmpeg...")
        
        # Determine output codec based on input
        output_codec = "libx265" if video_info['codec_name'] in ['hevc', 'h265'] else "libx264"
        
        cmd = [
            "ffmpeg", "-i", local_video_path,
            "-c:a", "copy",
            "-c:v", output_codec, "-preset", "slow", "-crf", "18",
            "-pix_fmt", "yuv420p"
        ]

        # Add ASS filter
        cmd.extend(["-vf", f"ass={local_subs_path}:fontsdir={font_dir}"])
        
        # Preserve color metadata
        if video_info.get('color_primaries'):
            cmd.extend(["-color_primaries", video_info['color_primaries']])
        if video_info.get('color_transfer'):
            cmd.extend(["-color_trc", video_info['color_transfer']])
        if video_info.get('color_space'):
            cmd.extend(["-colorspace", video_info['color_space']])

        cmd.extend(["-y", local_output_path])

        start_time = time.time()
        subprocess.run(cmd, check=True)
        render_time = time.time() - start_time
        print(f"Render completed in {render_time:.2f}s")

        output_s3_key = f"exports/{project_id}/final.mp4"
        print(f"Uploading to R2 as {output_s3_key}...")
        
        s3.upload_file(
            local_output_path, 
            bucket_name, 
            output_s3_key,
            ExtraArgs={'ContentType': 'video/mp4'}
        )

        export_url = output_s3_key
        
        supabase.table("projects").update({
            "export_status": "completed",
            "export_url": export_url
        }).eq("id", project_id).execute()

        # Cleanup
        if os.path.exists(local_video_path): os.remove(local_video_path)
        if os.path.exists(local_subs_path): os.remove(local_subs_path)
        if os.path.exists(local_output_path): os.remove(local_output_path)

    except Exception as e:
        error_message = str(e)
        print(f"Export Failed: {error_message}")
        supabase.table("projects").update({
            "export_status": "failed",
            "export_error": error_message
        }).eq("id", project_id).execute()


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("vidyut-secrets")]
)
@modal.fastapi_endpoint(method="POST")
def trigger_export(data: dict):
    project_id = data.get("project_id")
    s3_key = data.get("s3_key")
    measurements = data.get("measurements")
    subtitle_mode = data.get("subtitle_mode", "original")
    resolved_styles = data.get("resolved_styles")
    if not project_id or not s3_key:
        return {"error": "Missing project_id or s3_key"}, 400
    
    render_video.spawn(project_id, s3_key, measurements, subtitle_mode, resolved_styles)
    return {"status": "export_started", "project_id": project_id}
