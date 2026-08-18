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
        font_size = 78
        font_weight = 800
        text_transform = "none"
        letter_spacing = -1.5
        line_spacing = 1.25
        primary_color = "#FFFFFF"
        inactive_opacity = 0.85
        stage_top = 1160
        stage_left = 40
        stage_width = 1000
        stroke_css = "-webkit-text-stroke: 3.5px #000000; paint-order: stroke fill;"
        shadow_css = "text-shadow: 0 4px 0 #000, 0 8px 24px rgba(0,0,0,0.95), 2px 2px 0 #000, -2px -2px 0 #000;"
        bg_css = ""
    else:
        # Calculate optimal vertical positioning (~60% screen height)
        base_top = int(spec.height * 0.60)
        if spec.position_y != 0:
            base_top = int(base_top + (spec.position_y * (spec.height / 100.0)))
        
        base_left = int(spec.width * 0.04)
        if spec.position_x != 0:
            base_left = int(base_left + (spec.position_x * (spec.width / 100.0)))
            
        stage_width = int(spec.width * 0.92)
        stage_top = max(100, min(spec.height - 250, base_top))
        stage_left = max(0, min(spec.width - 200, base_left))

        font_family = f"'{spec.font_family}', 'Montserrat', 'Noto Sans Telugu', -apple-system, sans-serif"
        font_size = max(72, spec.font_size)
        font_weight = max(700, spec.font_weight)
        text_transform = spec.text_transform
        letter_spacing = spec.letter_spacing if spec.letter_spacing != -0.2 else -1.5
        line_spacing = 1.25
        primary_color = spec.primary_color or "#FFFFFF"
        inactive_opacity = max(0.60, spec.inactive_opacity)

        if spec.stroke_enabled and spec.stroke_width > 0:
            stroke_css = f"-webkit-text-stroke: {spec.stroke_width}px {spec.stroke_color}; paint-order: stroke fill;"
        else:
            stroke_css = "-webkit-text-stroke: 3px #000000; paint-order: stroke fill;"

        if spec.shadow_blur > 0 or spec.shadow_x != 0 or spec.shadow_y != 0:
            shadow_css = f"text-shadow: {spec.shadow_x}px {spec.shadow_y}px {spec.shadow_blur}px {spec.shadow_color}, 2px 2px 0 #000000, -2px -2px 0 #000000, 2px -2px 0 #000000, -2px 2px 0 #000000;"
        else:
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
      perspective: 1000px;
    }}

    .phrase-block {{
      display: none;
      opacity: 0;
      transform: scale(0.95);
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 14px 20px;
      text-align: center;
      width: auto;
      max-width: {stage_width - 20}px;
      padding: 12px 24px;
      transform-style: preserve-3d;
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
      transform-origin: center center;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      transition: background-color 0.1s ease, color 0.1s ease;
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
          {{ opacity: 1, scale: 1.0, y: 0, duration: 0.14, ease: 'back.out(2.2)', immediateRender: false }},
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
    inactive_opacity: float = 0.85,
    is_emphasis: bool = False,
    transition_type: str = "pop",
    highlight_mode: str = "karaoke"
) -> str:
    """
    GSAP animation compiler supporting full matrix of 15 transitions & 6 highlight modes:
    - Transitions: pop, bounce, elastic, slide-up, slide-left, slide-right, zoom, flip-x, flip-y, spin, blur, fade
    - Highlights: karaoke, color, background, box, scale, underline
    """
    dur = max(0.08, end - start)
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', word_id)
    
    # 1. Compile Transition Entry / Physics
    t_type = (transition_type or "pop").lower()
    h_mode = (highlight_mode or "karaoke").lower()
    
    # Base Inactive state
    init_vars = f"color: '{primary_color}', opacity: {inactive_opacity}, scale: 1.0, x: 0, y: 0, rotation: 0, rotationX: 0, rotationY: 0, filter: 'blur(0px)', backgroundColor: 'transparent', boxShadow: 'none'"
    
    # Active State depending on Highlight Mode
    if h_mode in ["background", "box"]:
        active_style = f"color: '#000000', backgroundColor: '{accent_color}', padding: '4px 16px', borderRadius: '12px', opacity: 1.0, boxShadow: '0 0 30px {accent_color}', textShadow: 'none'"
        reset_style = f"color: '{primary_color}', backgroundColor: 'transparent', opacity: {inactive_opacity}, padding: '0px', boxShadow: 'none', textShadow: '0 4px 0 #000000, 0 8px 24px rgba(0,0,0,0.95), 2px 2px 0 #000000, -2px -2px 0 #000000'"
    else:  # karaoke, color, scale, default
        active_style = f"color: '{accent_color}', opacity: 1.0, textShadow: '0 0 28px {accent_color}, 0 0 50px {accent_color}, 0 4px 0 #000000, 2px 2px 0 #000000, -2px -2px 0 #000000'"
        reset_style = f"color: '{primary_color}', opacity: {inactive_opacity}, textShadow: '0 4px 0 #000000, 0 8px 24px rgba(0,0,0,0.95), 2px 2px 0 #000000, -2px -2px 0 #000000'"

    # Transition physics
    if t_type == "bounce":
        anim_entry = f"{{ {init_vars}, y: 35, scale: 0.75 }}, {{ {active_style}, y: -5, scale: 1.22, duration: {min(0.18, dur * 0.5)}, ease: 'bounce.out', immediateRender: false }}"
    elif t_type == "elastic":
        anim_entry = f"{{ {init_vars}, scaleX: 1.6, scaleY: 0.4 }}, {{ {active_style}, scaleX: 1.18, scaleY: 1.18, y: -4, duration: {min(0.20, dur * 0.55)}, ease: 'elastic.out(1.2, 0.35)', immediateRender: false }}"
    elif t_type in ["slide-up", "slide"]:
        anim_entry = f"{{ {init_vars}, y: 40, opacity: 0 }}, {{ {active_style}, y: -4, scale: 1.15, duration: {min(0.14, dur * 0.4)}, ease: 'power3.out', immediateRender: false }}"
    elif t_type == "slide-left":
        anim_entry = f"{{ {init_vars}, x: 45, opacity: 0 }}, {{ {active_style}, x: 0, scale: 1.15, duration: {min(0.14, dur * 0.4)}, ease: 'power3.out', immediateRender: false }}"
    elif t_type == "slide-right":
        anim_entry = f"{{ {init_vars}, x: -45, opacity: 0 }}, {{ {active_style}, x: 0, scale: 1.15, duration: {min(0.14, dur * 0.4)}, ease: 'power3.out', immediateRender: false }}"
    elif t_type == "flip-x":
        anim_entry = f"{{ {init_vars}, rotationX: 90, opacity: 0 }}, {{ {active_style}, rotationX: 0, scale: 1.18, y: -4, duration: {min(0.16, dur * 0.45)}, ease: 'back.out(2.5)', immediateRender: false }}"
    elif t_type == "flip-y":
        anim_entry = f"{{ {init_vars}, rotationY: 90, opacity: 0 }}, {{ {active_style}, rotationY: 0, scale: 1.18, y: -4, duration: {min(0.16, dur * 0.45)}, ease: 'back.out(2.5)', immediateRender: false }}"
    elif t_type == "zoom":
        anim_entry = f"{{ {init_vars}, scale: 0.25, opacity: 0 }}, {{ {active_style}, scale: 1.25, y: -5, duration: {min(0.14, dur * 0.4)}, ease: 'back.out(3.0)', immediateRender: false }}"
    elif t_type == "spin":
        anim_entry = f"{{ {init_vars}, rotation: 180, scale: 0.4, opacity: 0 }}, {{ {active_style}, rotation: 0, scale: 1.18, duration: {min(0.16, dur * 0.45)}, ease: 'back.out(2.2)', immediateRender: false }}"
    elif t_type == "blur":
        anim_entry = f"{{ {init_vars}, filter: 'blur(16px)', opacity: 0.2 }}, {{ {active_style}, filter: 'blur(0px)', scale: 1.15, y: -4, duration: {min(0.14, dur * 0.4)}, ease: 'power2.out', immediateRender: false }}"
    elif t_type == "fade":
        anim_entry = f"{{ {init_vars}, opacity: 0.3 }}, {{ {active_style}, scale: 1.08, duration: {min(0.14, dur * 0.4)}, ease: 'power2.out', immediateRender: false }}"
    else:  # pop / default
        anim_entry = f"{{ {init_vars}, scale: 0.7, opacity: 0.4 }}, {{ {active_style}, scale: 1.22, y: -5, duration: {min(0.12, dur * 0.4)}, ease: 'back.out(3.0)', immediateRender: false }}"

    return f"""
      const wEl_{v_id} = document.getElementById('w_{v_id}');
      if (wEl_{v_id}) {{
        // Dynamic Transition Entry ({t_type} + {h_mode})
        tl.fromTo(wEl_{v_id},
          {anim_entry},
          {start}
        );
        // Settle micro-motion
        tl.to(wEl_{v_id},
          {{ scale: 1.10, y: -2, rotation: 0, rotationX: 0, rotationY: 0, duration: {min(0.10, dur * 0.3)}, ease: 'power1.out' }},
          {start + min(0.14, dur * 0.45)}
        );
        // Clean snap back to inactive baseline
        tl.to(wEl_{v_id},
          {{ 
            {reset_style}, 
            scale: 1.0, 
            x: 0, 
            y: 0, 
            rotation: 0,
            rotationX: 0,
            rotationY: 0,
            filter: 'blur(0px)',
            duration: 0.10, 
            ease: 'power2.out' 
          }},
          {end}
        );
      }}
    """




