import re
from typing import Optional
from motion_spec import MotionIntentSpec

"""
KineticRail Component: Ultra-Crisp Floating Kinetic Typography (Viral Studio Quality)
- Optimized positioning: Sits at ~62% screen height (chest level), safe from UI overlays
- Bold 76-92px typography with tight tracking (-1.5px) for maximum readability
- Layered 3D drop-shadows and thick vector strokes (paint-order: stroke fill)
- High-intensity active neon spring pop (scale: 1.22, y: -6px, back.out(3.2))
"""

def generate_kinetic_rail_css(spec: Optional[MotionIntentSpec] = None) -> str:
    if spec is None:
        font_family = "'Montserrat', 'Noto Sans Telugu', -apple-system, sans-serif"
        font_size = 76
        font_weight = 900
        text_transform = "uppercase"
        letter_spacing = -1.5
        line_spacing = 1.25
        primary_color = "#FFFFFF"
        inactive_opacity = 0.80
        stroke_css = "-webkit-text-stroke: 3.5px #000000; paint-order: stroke fill;"
        shadow_css = "text-shadow: 0 4px 0 #000, 0 8px 20px rgba(0,0,0,0.9), 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000;"
        bg_css = ""
        stage_top = 1180
        stage_left = 40
        stage_width = 1000
    else:
        # Calculate optimal vertical positioning (~62% screen height)
        base_top = int(spec.height * 0.62)
        if spec.position_y != 0:
            base_top = int(base_top + (spec.position_y * (spec.height / 100.0)))
        
        base_left = int(spec.width * 0.04)
        if spec.position_x != 0:
            base_left = int(base_left + (spec.position_x * (spec.width / 100.0)))
            
        stage_width = int(spec.width * 0.92)
        stage_top = max(100, min(spec.height - 250, base_top))
        stage_left = max(0, min(spec.width - 200, base_left))

        font_family = f"'{spec.font_family}', 'Montserrat', 'Noto Sans Telugu', -apple-system, sans-serif"
        font_size = max(68, spec.font_size)
        font_weight = max(800, spec.font_weight)
        text_transform = spec.text_transform
        letter_spacing = spec.letter_spacing if spec.letter_spacing != -0.2 else -1.5
        line_spacing = 1.25
        primary_color = spec.primary_color or "#FFFFFF"
        inactive_opacity = max(0.70, spec.inactive_opacity)

        if spec.stroke_enabled and spec.stroke_width > 0:
            stroke_width = max(3.0, spec.stroke_width)
            stroke_css = f"-webkit-text-stroke: {stroke_width}px {spec.stroke_color}; paint-order: stroke fill;"
        else:
            stroke_css = "-webkit-text-stroke: 3.5px #000000; paint-order: stroke fill;"

        shadow_css = f"text-shadow: 0 4px 0 #000000, 0 8px 24px rgba(0, 0, 0, 0.95), 2px 2px 0 #000000, -2px -2px 0 #000000, 2px -2px 0 #000000, -2px 2px 0 #000000;"

        if spec.background_enabled:
            bg_css = f"""
            background: {spec.background_color};
            padding: {spec.background_padding_y}px {spec.background_padding_x}px;
            border-radius: {spec.background_radius}px;
            box-shadow: 0 12px 32px rgba(0,0,0,0.6);
            backdrop-filter: blur(12px);
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
      gap: 14px 22px;
      text-align: center;
      width: auto;
      max-width: {stage_width - 20}px;
      padding: 12px 20px;
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
      transform: scale(1.22) translateY(-6px);
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
          {{ opacity: 0, scale: 0.90, y: 20 }},
          {{ opacity: 1, scale: 1.0, y: 0, duration: 0.14, ease: 'back.out(2.2)', immediateRender: false }},
          {start}
        );
        tl.to(pEl_{v_id},
          {{ opacity: 0, scale: 0.94, y: 10, duration: 0.10, ease: 'power2.in' }},
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
    inactive_opacity: float = 0.80,
    is_emphasis: bool = False,
    transition_type: str = "pop"
) -> str:
    """GSAP word pop highlight and settle animations with high-intensity electric glow and spring physics."""
    dur = max(0.08, end - start)
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', word_id)
    
    if transition_type in ["bounce", "elastic"]:
        scale_pop = 1.32 if is_emphasis else 1.24
        ease_in = "elastic.out(1, 0.35)"
        rotation_deg = "-4" if is_emphasis else "0"
    elif transition_type in ["slide", "slide-up"]:
        scale_pop = 1.22 if is_emphasis else 1.15
        ease_in = "back.out(2.5)"
        rotation_deg = "0"
    elif transition_type in ["fade", "subtle"]:
        scale_pop = 1.12 if is_emphasis else 1.06
        ease_in = "power2.out"
        rotation_deg = "0"
    else:  # pop / viral default
        scale_pop = 1.28 if is_emphasis else 1.22
        ease_in = "back.out(3.2)"
        rotation_deg = "-3" if is_emphasis else "0"
    
    return f"""
      const wEl_{v_id} = document.getElementById('w_{v_id}');
      if (wEl_{v_id}) {{
        // Explosive active word punch with vibrant glow
        tl.fromTo(wEl_{v_id},
          {{ color: '{primary_color}', opacity: {inactive_opacity}, scale: 1.0, y: 0, rotation: 0 }},
          {{ 
            color: '{accent_color}', 
            opacity: 1.0, 
            scale: {scale_pop}, 
            y: -6,
            rotation: {rotation_deg},
            textShadow: '0 0 24px {accent_color}, 0 0 45px {accent_color}, 0 4px 0 #000000, 2px 2px 0 #000000, -2px -2px 0 #000000, 2px -2px 0 #000000, -2px 2px 0 #000000', 
            duration: {min(0.12, dur * 0.4)}, 
            ease: '{ease_in}',
            immediateRender: false
          }},
          {start}
        );
        // Settle into steady spoken state
        tl.to(wEl_{v_id},
          {{ scale: {1.14 if is_emphasis else 1.08}, y: -2, rotation: 0, duration: {min(0.10, dur * 0.3)}, ease: 'power1.out' }},
          {start + min(0.12, dur * 0.4)}
        );
        // Clean snap back to inactive baseline
        tl.to(wEl_{v_id},
          {{ 
            color: '{primary_color}', 
            opacity: {inactive_opacity}, 
            scale: 1.0, 
            y: 0,
            textShadow: '0 4px 0 #000000, 0 8px 20px rgba(0,0,0,0.9), 2px 2px 0 #000000, -2px -2px 0 #000000, 2px -2px 0 #000000, -2px 2px 0 #000000', 
            duration: 0.10, 
            ease: 'power2.out' 
          }},
          {end}
        );
      }}
    """


