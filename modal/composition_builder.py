from typing import Dict, Any, List
from motion_spec import MotionIntentSpec
from motion_compiler import compile_motion_timeline
from motion_components.hero_word import generate_hero_word_css
from motion_components.kinetic_rail import generate_kinetic_rail_css

def generate_hyperframes_html(
    spec: MotionIntentSpec,
    video_src: str,
    matte_src: str = None,
    plate_src: str = None
) -> str:
    """
    Generates a full HyperFrames-compliant HTML document with multi-plane Z-depth stack
    and deterministic GSAP timeline using robust string replacement.
    """
    has_matte = bool(matte_src and plate_src)
    timeline_script = compile_motion_timeline(spec)

    # Pre-render DOM elements for phrases & hero items
    hero_dom_items: List[str] = []
    phrase_dom_items: List[str] = []

    hero_set = set(spec.hero_word_ids)

    for phrase in spec.phrases:
        words_html = []
        for w in phrase.words:
            words_html.append(f'<span id="w_{w.id}" class="word">{w.text}</span>')
            if w.id in hero_set or w.visual_intent == "hero":
                hero_dom_items.append(f'<div id="hero_{w.id}" class="hero-word-item">{w.text}</div>')
        
        words_joined = "".join(words_html)
        phrase_dom_items.append(f'<div id="{phrase.id}" class="phrase-block">{words_joined}</div>')

    hero_elements_html = "\n".join(hero_dom_items)
    phrase_elements_html = "\n".join(phrase_dom_items)

    hero_css = generate_hero_word_css()
    rail_css = generate_kinetic_rail_css()

    plate_video_tag = f'<video id="plate-video-layer" class="plate-video clip" src="{plate_src}" data-start="0" data-duration="{spec.duration_seconds}" playsinline muted></video>' if has_matte else ''
    subject_video_tag = f'<video id="subject-video-layer" class="subject-video clip" src="{matte_src}" data-start="0" data-duration="{spec.duration_seconds}" playsinline muted></video>' if has_matte else ''

    html_template = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>__COMPOSITION_ID__</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@800;900&family=Noto+Sans+Telugu:wght@800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body, html {
      width: __WIDTH__px;
      height: __HEIGHT__px;
      overflow: hidden;
      background: #000000;
      font-family: '__FONT_FAMILY__', 'Noto Sans Telugu', 'Montserrat', sans-serif;
    }

    #root {
      position: relative;
      width: __WIDTH__px;
      height: __HEIGHT__px;
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
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body>
  <div id="root" data-composition-id="__COMPOSITION_ID__" data-width="__WIDTH__" data-height="__HEIGHT__" data-start="0" data-duration="__DURATION__">
    <!-- Track 0: Background Video Plate -->
    <video id="bg-video-layer" class="bg-video clip" src="__VIDEO_SRC__" data-start="0" data-duration="__DURATION__" playsinline muted></video>

    __PLATE_VIDEO_TAG__

    <!-- Track 3: 3D Punch Hero Climax Words (Behind Speaker) -->
    <div id="hero-stage" class="hero-stage">
      __HERO_ELEMENTS_HTML__
    </div>

    __SUBJECT_VIDEO_TAG__

    <!-- Track 5: Glassmorphic Kinetic Lower-Third Caption Rail -->
    <div id="phrase-stage" class="phrase-stage">
      __PHRASE_ELEMENTS_HTML__
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
    result = result.replace("__DURATION__", str(spec.duration_seconds))
    result = result.replace("__VIDEO_SRC__", str(video_src))
    result = result.replace("__PLATE_VIDEO_TAG__", plate_video_tag)
    result = result.replace("__HERO_ELEMENTS_HTML__", hero_elements_html)
    result = result.replace("__SUBJECT_VIDEO_TAG__", subject_video_tag)
    result = result.replace("__PHRASE_ELEMENTS_HTML__", phrase_elements_html)
    result = result.replace("__HERO_CSS__", hero_css)
    result = result.replace("__RAIL_CSS__", rail_css)
    result = result.replace("__TIMELINE_SCRIPT__", timeline_script)

    return result
