import re

"""
KineticRail Component: Ultra-Crisp Floating Kinetic Typography
- Uses paint-order: stroke fill to prevent stroke bleeding into complex Indic/Telugu glyphs
- Razor-sharp vector outlines with hard-edge contrast
- Spring micro-motion and vibrant pop without muddy blur halos
"""

def generate_kinetic_rail_css() -> str:
    return """
    .phrase-stage {
      position: absolute;
      top: 1400px;
      left: 40px;
      width: 1000px;
      z-index: 50;
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: none;
    }

    .phrase-block {
      display: none;
      opacity: 0;
      transform: scale(0.95);
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 12px 20px;
      text-align: center;
      width: auto;
      max-width: 980px;
      padding: 10px 16px;
    }

    .word {
      display: inline-block;
      font-family: 'Noto Sans Telugu', 'Montserrat', -apple-system, sans-serif;
      font-size: 56px;
      font-weight: 800;
      color: #FFFFFF;
      opacity: 0.75;
      transform: scale(1.0);
      paint-order: stroke fill;
      -webkit-text-stroke: 2.5px #000000;
      text-shadow: 
        2px 2px 0px #000000,
        -2px -2px 0px #000000,
        2px -2px 0px #000000,
        -2px 2px 0px #000000,
        0px 3px 0px #000000,
        0px 6px 12px rgba(0, 0, 0, 0.85);
      word-break: keep-all;
      letter-spacing: -0.2px;
      line-height: 1.35;
      transform-origin: center bottom;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .word.active {
      opacity: 1.0;
      transform: scale(1.15);
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
          {{ opacity: 0, scale: 0.92, y: 16 }},
          {{ opacity: 1, scale: 1.0, y: 0, duration: 0.15, ease: 'back.out(2.0)' }},
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
    is_emphasis: bool = False
) -> str:
    """GSAP word pop highlight and settle animations with sharp vector contrast."""
    dur = max(0.1, end - start)
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', word_id)
    
    scale_pop = 1.25 if is_emphasis else 1.14
    rotation_deg = "-3" if is_emphasis else "0"
    
    return f"""
      const wEl_{v_id} = document.getElementById('w_{v_id}');
      if (wEl_{v_id}) {{
        // Pop in active state with razor-sharp contrast
        tl.fromTo(wEl_{v_id},
          {{ color: '#FFFFFF', opacity: 0.75, scale: 1.0, rotation: 0 }},
          {{ 
            color: '{accent_color}', 
            opacity: 1.0, 
            scale: {scale_pop}, 
            rotation: {rotation_deg},
            textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 0 #000, 0 0 12px {accent_color}, 0 6px 14px rgba(0,0,0,0.85)', 
            duration: {min(0.12, dur * 0.4)}, 
            ease: 'back.out(2.8)' 
          }},
          {start}
        );
        // Settle slightly
        tl.to(wEl_{v_id},
          {{ scale: {1.10 if is_emphasis else 1.05}, rotation: 0, duration: {min(0.1, dur * 0.3)}, ease: 'power1.out' }},
          {start + min(0.12, dur * 0.4)}
        );
        // Decay to inactive
        tl.to(wEl_{v_id},
          {{ 
            color: '#FFFFFF', 
            opacity: 0.75, 
            scale: 1.0, 
            textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 0 #000, 0 6px 12px rgba(0,0,0,0.85)', 
            duration: 0.10, 
            ease: 'power2.out' 
          }},
          {end}
        );
      }}
    """
