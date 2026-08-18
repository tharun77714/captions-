import re
from typing import Optional
from motion_spec import MotionIntentSpec

"""
KineticRail Component: Ultra-Crisp Floating Kinetic Typography
- Uses paint-order: stroke fill to prevent stroke bleeding into complex Indic/Telugu glyphs
- Razor-sharp vector outlines with hard-edge contrast
- Spring micro-motion and dynamic transition archetypes (pop, bounce, elastic, slide, fade)
- Strict display: none / block lifecycle with immediateRender: false
"""

def generate_kinetic_rail_css(spec: Optional[MotionIntentSpec] = None) -> str:
    if spec is None:
        font_family = "'Noto Sans Telugu', 'Montserrat', -apple-system, sans-serif"
        font_size = 56
        font_weight = 800
        text_transform = "none"
        letter_spacing = -0.2
        line_spacing = 1.35
        primary_color = "#FFFFFF"
        inactive_opacity = 0.75
        stroke_css = "-webkit-text-stroke: 2.5px #000000; paint-order: stroke fill;"
        shadow_css = "text-shadow: 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 0 #000, 0 6px 12px rgba(0, 0, 0, 0.85);"
        bg_css = ""
        stage_top = 1400
        stage_left = 40
        stage_width = 1000
    else:
        # Calculate Y positioning based on aspect ratio, height, and user offsets
        base_top = int(spec.height * 0.72)
        if spec.position_y != 0:
            base_top = int(base_top + (spec.position_y * (spec.height / 100.0)))
        
        base_left = int(spec.width * 0.04)
        if spec.position_x != 0:
            base_left = int(base_left + (spec.position_x * (spec.width / 100.0)))
            
        stage_width = int(spec.width * 0.92)
        stage_top = max(50, min(spec.height - 200, base_top))
        stage_left = max(0, min(spec.width - 200, base_left))

        font_family = f"'{spec.font_family}', 'Noto Sans Telugu', 'Montserrat', -apple-system, sans-serif"
        font_size = spec.font_size
        font_weight = spec.font_weight
        text_transform = spec.text_transform
        letter_spacing = spec.letter_spacing
        line_spacing = spec.line_spacing
        primary_color = spec.primary_color
        inactive_opacity = spec.inactive_opacity

        if spec.stroke_enabled and spec.stroke_width > 0:
            stroke_css = f"-webkit-text-stroke: {spec.stroke_width}px {spec.stroke_color}; paint-order: stroke fill;"
        else:
            stroke_css = ""

        if spec.shadow_blur > 0 or spec.shadow_x != 0 or spec.shadow_y != 0:
            shadow_css = f"text-shadow: {spec.shadow_x}px {spec.shadow_y}px {spec.shadow_blur}px {spec.shadow_color}, 2px 2px 0 #000000, -2px -2px 0 #000000;"
        else:
            shadow_css = "text-shadow: 2px 2px 0 #000, -2px -2px 0 #000, 0 4px 8px rgba(0,0,0,0.6);"

        if spec.background_enabled:
            bg_css = f"""
            background: {spec.background_color};
            padding: {spec.background_padding_y}px {spec.background_padding_x}px;
            border-radius: {spec.background_radius}px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            """
        else:
            bg_css = ""

    return f"""
    .phrase-stage {{
      position: absolute;
      top: {stage_top}px;
      left: {stage_left}px;
      width: {stage_width}px;
      z-index: 50;
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: none;
    }}

    .phrase-block {{
      display: none;
      opacity: 0;
      transform: scale(0.95);
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 12px 20px;
      text-align: center;
      width: auto;
      max-width: {stage_width - 20}px;
      padding: 10px 16px;
      {bg_css}
    }}

    .word {{
      display: inline-block;
      font-family: {font_family};
      font-size: {font_size}px;
      font-weight: {font_weight};
      text-transform: {text_transform};
      color: {primary_color};
      opacity: {inactive_opacity};
      transform: scale(1.0);
      {stroke_css}
      {shadow_css}
      word-break: keep-all;
      letter-spacing: {letter_spacing}px;
      line-height: {line_spacing};
      transform-origin: center bottom;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }}

    .word.active {{
      opacity: 1.0;
      transform: scale(1.15);
    }}
    """

def generate_phrase_block_animation(phrase_id: str, start: float, end: float) -> str:
    """GSAP phrase lifecycle animations."""
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', phrase_id)
    return f"""
      const pEl_{v_id} = document.getElementById('{v_id}');
      if (pEl_{v_id}) {{
        tl.set(pEl_{v_id}, {{ display: 'flex' }}, {start});
        tl.fromTo(pEl_{v_id},
          {{ opacity: 0, scale: 0.92, y: 16 }},
          {{ opacity: 1, scale: 1.0, y: 0, duration: 0.15, ease: 'back.out(2.0)', immediateRender: false }},
          {start}
        );
        tl.to(pEl_{v_id},
          {{ opacity: 0, scale: 0.95, y: 8, duration: 0.10, ease: 'power2.in' }},
          {max(start + 0.1, end - 0.10)}
        );
        tl.set(pEl_{v_id}, {{ display: 'none' }}, {end});
      }}
    """

def generate_word_highlight_animation(
    word_id: str,
    start: float,
    end: float,
    accent_color: str = "#FFE600",
    primary_color: str = "#FFFFFF",
    inactive_opacity: float = 0.75,
    is_emphasis: bool = False,
    transition_type: str = "pop"
) -> str:
    """GSAP word pop highlight and settle animations with sharp vector contrast and configurable transition archetypes."""
    dur = max(0.08, end - start)
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', word_id)
    
    if transition_type in ["bounce", "elastic"]:
        scale_pop = 1.28 if is_emphasis else 1.20
        ease_in = "elastic.out(1, 0.4)"
        rotation_deg = "-4" if is_emphasis else "0"
    elif transition_type in ["slide", "slide-up"]:
        scale_pop = 1.18 if is_emphasis else 1.10
        ease_in = "back.out(2.2)"
        rotation_deg = "0"
    elif transition_type in ["fade", "subtle"]:
        scale_pop = 1.10 if is_emphasis else 1.04
        ease_in = "power2.out"
        rotation_deg = "0"
    else:  # pop / default
        scale_pop = 1.25 if is_emphasis else 1.15
        ease_in = "back.out(2.8)"
        rotation_deg = "-3" if is_emphasis else "0"
    
    return f"""
      const wEl_{v_id} = document.getElementById('w_{v_id}');
      if (wEl_{v_id}) {{
        // Pop into active highlight
        tl.fromTo(wEl_{v_id},
          {{ color: '{primary_color}', opacity: {inactive_opacity}, scale: 1.0, rotation: 0 }},
          {{ 
            color: '{accent_color}', 
            opacity: 1.0, 
            scale: {scale_pop}, 
            rotation: {rotation_deg},
            textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 0 #000, 0 0 16px {accent_color}, 0 6px 14px rgba(0,0,0,0.85)', 
            duration: {min(0.12, dur * 0.4)}, 
            ease: '{ease_in}',
            immediateRender: false
          }},
          {start}
        );
        // Settle micro-motion
        tl.to(wEl_{v_id},
          {{ scale: {1.10 if is_emphasis else 1.05}, rotation: 0, duration: {min(0.1, dur * 0.3)}, ease: 'power1.out' }},
          {start + min(0.12, dur * 0.4)}
        );
        // Return to inactive state
        tl.to(wEl_{v_id},
          {{ 
            color: '{primary_color}', 
            opacity: {inactive_opacity}, 
            scale: 1.0, 
            textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 0 #000, 0 6px 12px rgba(0,0,0,0.85)', 
            duration: 0.10, 
            ease: 'power2.out' 
          }},
          {end}
        );
      }}
    """

