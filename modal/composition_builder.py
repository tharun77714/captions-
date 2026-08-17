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
    and deterministic GSAP timeline.
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
  <title>{composition_id}</title>
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
      width: {width}px;
      height: {height}px;
      overflow: hidden;
      background: #000000;
      font-family: '{font_family}', 'Noto Sans Telugu', 'Montserrat', sans-serif;
    }

    #root {
      position: relative;
      width: {width}px;
      height: {height}px;
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

    {hero_css}
    {rail_css}
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body>
  <div id="root" data-composition-id="{composition_id}" data-width="{width}" data-height="{height}" data-start="0" data-duration="{duration_seconds}">
    <!-- Track 0: Background Video Plate -->
    <video id="bg-video-layer" class="bg-video clip" src="{video_src}" data-start="0" data-duration="{duration_seconds}" playsinline muted></video>

    {plate_video_tag}

    <!-- Track 3: 3D Punch Hero Climax Words (Behind Speaker) -->
    <div id="hero-stage" class="hero-stage">
      {hero_elements_html}
    </div>

    {subject_video_tag}

    <!-- Track 5: Glassmorphic Kinetic Lower-Third Caption Rail -->
    <div id="phrase-stage" class="phrase-stage">
      {phrase_elements_html}
    </div>
  </div>

  <script>
    {timeline_script}
    document.fonts.ready.then(function() {
      window.__captionReady = true;
    });
  </script>
</body>
</html>"""

    return html_template.format(
        composition_id=spec.composition_id,
        width=spec.width,
        height=spec.height,
        font_family=spec.font_family,
        duration_seconds=spec.duration_seconds,
        video_src=video_src,
        plate_video_tag=plate_video_tag,
        hero_elements_html=hero_elements_html,
        subject_video_tag=subject_video_tag,
        phrase_elements_html=phrase_elements_html,
        hero_css=hero_css,
        rail_css=rail_css,
        timeline_script=timeline_script
    )
