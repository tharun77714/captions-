import json
import re
from typing import Dict, Any, List
from motion_spec import MotionIntentSpec
from motion_components.hero_word import generate_hero_word_animation
from motion_components.kinetic_rail import generate_phrase_block_animation, generate_word_highlight_animation
from motion_components.particle_sparks import generate_spark_burst_animation
from motion_components.camera_punch import generate_camera_punch_animation
from motion_components.svg_callout import generate_svg_underline_animation

def compile_motion_timeline(spec: MotionIntentSpec) -> str:
    """
    Compiles high-level MotionIntentSpec into deterministic GSAP 3.x timelines
    registered under window.__timelines['root'] and window.__timelines[spec.composition_id].
    Integrates 80/15/5 visual hierarchy:
    - Standard: kinetic spring micro-motion
    - Emphasis: vibrant neon color pop, elastic slam, SVG underline, DOM spark burst & shockwave
    - Hero: 3D perspective depth behind subject, high-density particle burst, camera punch
    """
    script_lines: List[str] = [
        "window.__timelines = window.__timelines || {};",
        "const tl = gsap.timeline({ paused: true });",
    ]

    hero_set = set(spec.hero_word_ids)

    for phrase in spec.phrases:
        # Phrase container entry/exit
        script_lines.append(generate_phrase_block_animation(phrase.id, phrase.start, phrase.end))
        
        for w in phrase.words:
            is_hero = (w.id in hero_set or w.visual_intent == "hero")
            is_emphasis = (w.visual_intent == "emphasis")

            accent = w.color_intent or (spec.accent_color if is_hero else (spec.contrast_color if is_emphasis else "#FFFFFF"))

            # 1. Word Highlight in caption rail
            script_lines.append(
                generate_word_highlight_animation(
                    w.id,
                    w.start,
                    w.end,
                    accent_color=accent,
                    is_emphasis=is_emphasis or is_hero
                )
            )

            # 2. SVG underline on emphasis words
            if w.motion_intent == "svgUnderline" or is_emphasis:
                script_lines.append(generate_svg_underline_animation(w.id, w.start, w.end))

            # 3. Particle Sparks & Shockwaves for Emphasis & Hero hits
            if is_emphasis or is_hero:
                script_lines.append(
                    generate_spark_burst_animation(
                        w.id,
                        w.start,
                        color=accent,
                        is_hero=is_hero
                    )
                )

            # 4. Hero 3D Typography Behind Subject & Camera Punch
            if is_hero:
                script_lines.append(generate_hero_word_animation(w.id, w.start, w.end, color=accent))
                script_lines.append(generate_camera_punch_animation(w.start, archetype=spec.archetype))

    # Pad timeline to full duration
    script_lines.append(f"tl.to({{}}, {{ duration: {spec.duration_seconds} }}, 0);")
    script_lines.append(f"window.__timelines['root'] = tl;")
    script_lines.append(f"window.__timelines['{spec.composition_id}'] = tl;")

    return "\n".join(script_lines)
