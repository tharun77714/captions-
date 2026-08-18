import re
import urllib.parse
from typing import Dict, Any, List
from motion_spec import MotionIntentSpec
from motion_compiler import compile_motion_timeline
from motion_components.hero_word import generate_hero_word_css
from motion_components.kinetic_rail import generate_kinetic_rail_css
from motion_components.particle_sparks import generate_particle_css, generate_spark_dom_elements

def get_google_fonts_link(font_family: str) -> str:
    """Generates optimized Google Fonts <link> tags for the selected font family + Indic fonts."""
    clean_name = font_family.strip().replace('"', '').replace("'", "")
    encoded_name = urllib.parse.quote_plus(clean_name)
    return f"""
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family={encoded_name}:wght@400;600;700;800;900&family=Montserrat:wght@700;800;900&family=Noto+Sans+Telugu:wght@600;700;800;900&display=swap" rel="stylesheet">
    """

EMOJI_KEYWORD_MAP = {
    "hair": "💇‍♂️", "head": "🧔", "beard": "🧔", "oil": "🧴", "shampoo": "🧴",
    "seed": "🌱", "seeds": "🌱", "flax": "🌾", "food": "🥗", "eat": "🍽️", "eating": "🍽️", "diet": "🥗",
    "grow": "📈", "growth": "🚀", "strong": "💪", "gain": "📈", "fast": "⚡", "quick": "⚡",
    "money": "💰", "cash": "💵", "cost": "💳", "free": "🎁", "lakh": "💰", "crore": "💎", "rich": "🤑",
    "fire": "🔥", "hot": "🔥", "magic": "✨", "secret": "🤫", "power": "⚡", "super": "⚡", "insane": "🤯",
    "stop": "🛑", "danger": "⚠️", "warning": "⚠️", "mistake": "❌", "wrong": "❌",
    "best": "👑", "top": "🏆", "winner": "🥇", "perfect": "💯", "100": "💯",
    "హెయిర్": "💇‍♂️", "జుట్టు": "💇‍♂️", "సీడ్స్": "🌱", "తింటే": "🥗", "పెరుగుతుంది": "📈", "డబ్బులు": "💰"
}

def get_keyword_emoji(text: str) -> str:
    clean = re.sub(r'[^\w]', '', text).lower()
    for k, emoji in EMOJI_KEYWORD_MAP.items():
        if k == clean or (len(k) > 3 and k in clean):
            return emoji
    return ""

def generate_hyperframes_html(
    spec: MotionIntentSpec,
    video_src: str,
    matte_src: str = None,
    plate_src: str = None
) -> str:
    """
    Generates deterministic HTML5/CSS3/GSAP DOM markup for HyperFrames rendering.
    """
    has_matte = bool(matte_src and spec.enable_subject_separation)
    timeline_script = compile_motion_timeline(spec)

    # Pre-render DOM elements for phrases, hero items, and VFX particles
    hero_dom_items: List[str] = []
    phrase_dom_items: List[str] = []
    vfx_dom_items: List[str] = []

    hero_set = set(spec.hero_word_ids)

    for phrase in spec.phrases:
        p_vid = re.sub(r'[^a-zA-Z0-9_]', '_', phrase.id)
        words_html = []
        
        for w in phrase.words:
            w_vid = re.sub(r'[^a-zA-Z0-9_]', '_', w.id)
            is_hero = (w.id in hero_set or w.visual_intent == "hero")
            is_emphasis = (w.visual_intent == "emphasis")

            accent = w.color_intent or (spec.accent_color if is_hero else (spec.contrast_color if is_emphasis else "#FFE600"))
            
            # Format text case if requested
            word_text = w.text
            if spec.text_transform == "uppercase":
                word_text = word_text.upper()
            elif spec.text_transform == "lowercase":
                word_text = word_text.lower()
            elif spec.text_transform == "capitalize":
                word_text = word_text.capitalize()

            emoji = get_keyword_emoji(w.text)
            emoji_tag = f'<div id="emoji_{w_vid}" class="word-emoji-badge">{emoji}</div>' if emoji else ''

            words_html.append(
                f'<div class="word-wrapper">{emoji_tag}<span id="w_{w_vid}" class="word">{word_text}</span></div>'
            )
            
            if is_hero:
                hero_dom_items.append(f'<div id="hero_{w_vid}" class="hero-word-item">{word_text}</div>')
            
            if is_emphasis or is_hero:
                vfx_dom_items.append(generate_spark_dom_elements(w.id, color=accent, is_hero=is_hero))

        words_joined = "".join(words_html)
        phrase_dom_items.append(f'<div id="{p_vid}" class="phrase-block">{words_joined}</div>')

    hero_elements_html = "\n".join(hero_dom_items)
    phrase_elements_html = "\n".join(phrase_dom_items)
    vfx_elements_html = "\n".join(vfx_dom_items)

    hero_css = generate_hero_word_css()
    rail_css = generate_kinetic_rail_css(spec)
    vfx_css = generate_particle_css()
    fonts_links = get_google_fonts_link(spec.font_family)

    plate_video_tag = f'<video id="plate-video-layer" class="plate-video clip" src="{plate_src}" data-start="0" data-duration="{spec.duration_seconds}" playsinline muted></video>' if has_matte else ''
    subject_video_tag = f'<video id="subject-video-layer" class="subject-video clip" src="{matte_src}" data-start="0" data-duration="{spec.duration_seconds}" playsinline muted></video>' if has_matte else ''

    html_template = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>__COMPOSITION_ID__</title>
  __FONTS_LINKS__
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    body, html {
      width: __WIDTH__px;
      height: __HEIGHT__px;
      overflow: hidden;
      background: #000000;
      font-family: '__FONT_FAMILY__', 'Noto Sans Telugu', 'Montserrat', -apple-system, sans-serif;
    }

    #root {
      position: relative;
      width: __WIDTH__px;
      height: __HEIGHT__px;
      transform-origin: center center;
    }

    /* Track 0: Background Plate Video */
    .bg-video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 10;
      transform-origin: center center;
    }

    /* Track 2: Plate fallback */
    .plate-video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 20;
      pointer-events: none;
      transform-origin: center center;
    }

    /* Track 4: Subject Alpha Cutout */
    .subject-video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 40;
      pointer-events: none;
    }

    __HERO_CSS__
    __RAIL_CSS__
    __VFX_CSS__
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body>
  <div id="root" data-composition-id="__COMPOSITION_ID__" data-width="__WIDTH__" data-height="__HEIGHT__" data-start="0" data-duration="__DURATION__">
    <!-- Track 0: Background Video Plate -->
    <video id="bg-video-layer" class="bg-video clip" src="__VIDEO_SRC__" data-start="0" data-duration="__DURATION__" playsinline muted></video>

    __PLATE_VIDEO_TAG__

    <!-- Track 1: 3D Punch Hero Climax Words (Behind Speaker in upper billboard space) -->
    <div id="hero-stage" class="hero-stage">
      __HERO_ELEMENTS_HTML__
    </div>

    __SUBJECT_VIDEO_TAG__

    <!-- Track 3: Ultra-Crisp Floating Kinetic Caption Rail -->
    <div id="phrase-stage" class="phrase-stage">
      __PHRASE_ELEMENTS_HTML__
    </div>

    <!-- Track 4: Particle VFX & Shockwaves -->
    <div id="vfx-stage" class="vfx-stage">
      __VFX_ELEMENTS_HTML__
    </div>
  </div>

  <script>
    __TIMELINE_SCRIPT__
    document.fonts.ready.then(function() {
      window.__captionReady = true;
    });
  </script>
</body>
</html>"""

    result = html_template
    result = result.replace("__COMPOSITION_ID__", str(spec.composition_id))
    result = result.replace("__WIDTH__", str(spec.width))
    result = result.replace("__HEIGHT__", str(spec.height))
    result = result.replace("__FONT_FAMILY__", str(spec.font_family))
    result = result.replace("__FONTS_LINKS__", fonts_links)
    result = result.replace("__DURATION__", str(spec.duration_seconds))
    result = result.replace("__VIDEO_SRC__", str(video_src))
    result = result.replace("__PLATE_VIDEO_TAG__", plate_video_tag)
    result = result.replace("__HERO_ELEMENTS_HTML__", hero_elements_html)
    result = result.replace("__SUBJECT_VIDEO_TAG__", subject_video_tag)
    result = result.replace("__PHRASE_ELEMENTS_HTML__", phrase_elements_html)
    result = result.replace("__VFX_ELEMENTS_HTML__", vfx_elements_html)
    result = result.replace("__HERO_CSS__", hero_css)
    result = result.replace("__RAIL_CSS__", rail_css)
    result = result.replace("__VFX_CSS__", vfx_css)
    result = result.replace("__TIMELINE_SCRIPT__", timeline_script)

    return result

