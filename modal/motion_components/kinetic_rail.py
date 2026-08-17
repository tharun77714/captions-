import re

"""
KineticRail Component: Glassmorphic Lower-Third Caption Rail
Word-level highlighting, elastic scaling, and continuous sub-word progress.
"""

def generate_kinetic_rail_css() -> str:
    return """
    .phrase-stage {
      position: absolute;
      top: 1360px;
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
      transform: scale(0.92);
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 12px 20px;
      text-align: center;
      width: auto;
      max-width: 960px;
      padding: 16px 32px;
      background: rgba(12, 12, 18, 0.65);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 32px;
      border: 1.5px solid rgba(255, 255, 255, 0.18);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.2);
    }

    .word {
      display: inline-block;
      font-family: 'Noto Sans Telugu', 'Montserrat', sans-serif;
      font-size: 56px;
      font-weight: 800;
      color: #FFFFFF;
      opacity: 0.55;
      transform: scale(1.0);
      -webkit-text-stroke: 1.5px rgba(0, 0, 0, 0.8);
      text-shadow: 0 4px 16px rgba(0, 0, 0, 0.95);
      word-break: keep-all;
      letter-spacing: -0.5px;
      line-height: 1.3;
      transition: none;
    }

    .word.active {
      color: #FFE600;
      opacity: 1.0;
      transform: scale(1.15);
      text-shadow: 0 0 28px rgba(255, 230, 0, 0.9), 0 4px 16px #000000;
    }
    """

def generate_phrase_block_animation(phrase_id: str, start: float, end: float) -> str:
    """GSAP phrase lifecycle animations."""
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', phrase_id)
    return f"""
      const pEl_{v_id} = document.getElementById('{phrase_id}');
      if (pEl_{v_id}) {{
        tl.set(pEl_{v_id}, {{ display: 'flex' }}, {start});
        tl.fromTo(pEl_{v_id},
          {{ opacity: 0, scale: 0.88, y: 24 }},
          {{ opacity: 1, scale: 1.0, y: 0, duration: 0.18, ease: 'back.out(2)' }},
          {start}
        );
        tl.to(pEl_{v_id},
          {{ opacity: 0, scale: 0.92, y: 15, duration: 0.12, ease: 'power2.in' }},
          {max(start + 0.1, end - 0.12)}
        );
        tl.set(pEl_{v_id}, {{ display: 'none' }}, {end});
      }}
    """

def generate_word_highlight_animation(word_id: str, start: float, end: float, accent_color: str = "#FFE600") -> str:
    """GSAP word pop highlight and settle animations."""
    dur = max(0.1, end - start)
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', word_id)
    return f"""
      const wEl_{v_id} = document.getElementById('w_{word_id}');
      if (wEl_{v_id}) {{
        // Pop in active state
        tl.fromTo(wEl_{v_id},
          {{ color: '#FFFFFF', opacity: 0.55, scale: 1.0 }},
          {{ color: '{accent_color}', opacity: 1.0, scale: 1.15, textShadow: '0 0 28px {accent_color}, 0 4px 16px #000', duration: {min(0.12, dur * 0.4)}, ease: 'back.out(2.5)' }},
          {start}
        );
        // Settle slightly
        tl.to(wEl_{v_id},
          {{ scale: 1.06, duration: {min(0.1, dur * 0.3)}, ease: 'power1.out' }},
          {start + min(0.12, dur * 0.4)}
        );
        // Decay to inactive
        tl.to(wEl_{v_id},
          {{ color: '#FFFFFF', opacity: 0.55, scale: 1.0, textShadow: '0 4px 16px rgba(0,0,0,0.95)', duration: 0.12, ease: 'power2.out' }},
          {end}
        );
      }}
    """
