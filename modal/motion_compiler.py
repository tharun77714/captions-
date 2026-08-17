import json
from typing import Dict, Any, List
from motion_spec import MotionIntentSpec
from motion_components.hero_word import generate_hero_word_animation
from motion_components.kinetic_rail import generate_phrase_block_animation, generate_word_highlight_animation
from motion_components.svg_callout import generate_svg_underline_animation

def compile_motion_timeline(spec: MotionIntentSpec) -> str:
    """
    Compiles high-level MotionIntentSpec into deterministic GSAP 3.x timelines
    registered under window.__timelines['root'] and window.__timelines[spec.composition_id].
    """
    script_lines: List[str] = [
        "window.__timelines = window.__timelines || {};",
        "const tl = gsap.timeline({ paused: true });",
    ]

    hero_set = set(spec.hero_word_ids)

    # 1. Phrases and word-level highlighting
    for phrase in spec.phrases:
        script_lines.append(generate_phrase_block_animation(phrase.id, phrase.start, phrase.end))
        
        for w in phrase.words:
            # Word-level highlight
            accent = spec.accent_color if w.visual_intent == "hero" else (spec.contrast_color if w.visual_intent == "emphasis" else "#FFFFFF")
            script_lines.append(generate_word_highlight_animation(w.id, w.start, w.end, accent_color=accent))

            # SVG underline on emphasis words
            if w.motion_intent == "svgUnderline" or w.visual_intent == "emphasis":
                script_lines.append(generate_svg_underline_animation(w.id, w.start, w.end))

            # Hero 3D punch word behind subject
            if w.id in hero_set or w.visual_intent == "hero":
                script_lines.append(generate_hero_word_animation(w.id, w.start, w.end))

    # Pad timeline to duration
    script_lines.append(f"tl.to({{}}, {{ duration: {spec.duration_seconds} }}, 0);")
    script_lines.append(f"window.__timelines['root'] = tl;")
    script_lines.append(f"window.__timelines['{spec.composition_id}'] = tl;")

    return "\n".join(script_lines)
