import re

"""
KineticRail Component: High-Contrast Floating Kinetic Typography
No muddy dark container — pure, vibrant, floating text with 3D strokes,
layered drop shadows, and elastic spring micro-motion.
"""

def generate_kinetic_rail_css() -> str:
    return """
    .phrase-stage {
      position: absolute;
      top: 1380px;
      left: 54px;
      width: 972px;
      z-index: 50;
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: none;
    }

    .phrase-block {
      display: none;
      opacity: 0;
      transform: scale(0.94);
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 14px 22px;
      text-align: center;
      width: auto;
      max-width: 960px;
      padding: 12px 20px;
    }

    .word {
      display: inline-block;
      font-family: 'Noto Sans Telugu', 'Montserrat', sans-serif;
      font-size: 64px;
      font-weight: 900;
      color: #FFFFFF;
      opacity: 0.65;
      transform: scale(1.0);
      -webkit-text-stroke: 3.5px #000000;
      text-shadow: 
        3px 3px 0 #000000,
        -2px -2px 0 #000000,
        2px -2px 0 #000000,
        -2px 2px 0 #000000,
        0 6px 20px rgba(0, 0, 0, 0.95);
      word-break: keep-all;
      letter-spacing: -0.5px;
      line-height: 1.25;
      transform-origin: center bottom;
    }

    .word.active {
      opacity: 1.0;
      transform: scale(1.18);
    }
    """

def generate_phrase_block_animation(phrase_id: str, start: float, end: float) -> str:
    """GSAP phrase lifecycle animations."""
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', phrase_id)
    return f"""
      const pEl_{v_id} = document.getElementById('{v_id}');
      if (pEl_{v_id}) {{
        tl.set(pEl_{v_id}, {{ display: 'flex' }}, {start});
        tl.fromTo(pEl_{v_id},
          {{ opacity: 0, scale: 0.88, y: 20 }},
          {{ opacity: 1, scale: 1.0, y: 0, duration: 0.16, ease: 'back.out(2.2)' }},
          {start}
        );
        tl.to(pEl_{v_id},
          {{ opacity: 0, scale: 0.92, y: 12, duration: 0.12, ease: 'power2.in' }},
          {max(start + 0.1, end - 0.12)}
        );
        tl.set(pEl_{v_id}, {{ display: 'none' }}, {end});
      }}
    """

def generate_word_highlight_animation(
    word_id: str,
    start: float,
    end: float,
    accent_color: str = "#FFE600",
    is_emphasis: bool = False
) -> str:
    """GSAP word pop highlight and settle animations."""
    dur = max(0.1, end - start)
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', word_id)
    
    scale_pop = 1.30 if is_emphasis else 1.18
    rotation_deg = "-4" if is_emphasis else "0"
    
    return f"""
      const wEl_{v_id} = document.getElementById('w_{v_id}');
      if (wEl_{v_id}) {{
        // Pop in active state with spring bounce
        tl.fromTo(wEl_{v_id},
          {{ color: '#FFFFFF', opacity: 0.65, scale: 1.0, rotation: 0 }},
          {{ 
            color: '{accent_color}', 
            opacity: 1.0, 
            scale: {scale_pop}, 
            rotation: {rotation_deg},
            textShadow: '3px 3px 0 #000, -2px -2px 0 #000, 0 0 32px {accent_color}, 0 6px 20px rgba(0,0,0,0.95)', 
            duration: {min(0.14, dur * 0.4)}, 
            ease: 'back.out(3.0)' 
          }},
          {start}
        );
        // Settle slightly
        tl.to(wEl_{v_id},
          {{ scale: {1.12 if is_emphasis else 1.06}, rotation: 0, duration: {min(0.1, dur * 0.3)}, ease: 'power1.out' }},
          {start + min(0.14, dur * 0.4)}
        );
        // Decay to inactive
        tl.to(wEl_{v_id},
          {{ 
            color: '#FFFFFF', 
            opacity: 0.65, 
            scale: 1.0, 
            textShadow: '3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 6px 20px rgba(0,0,0,0.95)', 
            duration: 0.12, 
            ease: 'power2.out' 
          }},
          {end}
        );
      }}
    """
