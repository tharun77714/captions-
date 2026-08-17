import re

"""
HeroWord Component: Razor-Sharp 3D Punch & Climax Typography
- Placed above the speaker's head (top: 180px) in the upper background plate
- 3D perspective with zero-blur crisp extruded bevels
- paint-order: stroke fill so complex Telugu/Indic characters stay 100% crisp and readable
"""

def generate_hero_word_css() -> str:
    return """
    .hero-stage {
      position: absolute;
      top: 180px;
      left: 40px;
      width: 1000px;
      height: 320px;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      z-index: 30;
      pointer-events: none;
      perspective: 1000px;
      transform-style: preserve-3d;
    }

    .hero-word-item {
      font-family: 'Montserrat', 'Noto Sans Telugu', -apple-system, sans-serif;
      font-size: 118px;
      font-weight: 900;
      color: #FFE600;
      text-transform: uppercase;
      opacity: 0;
      display: none;
      transform: scale(0.7) rotateX(8deg) rotateY(-4deg);
      paint-order: stroke fill;
      -webkit-text-stroke: 4px #000000;
      text-shadow: 
        0px 2px 0px #000000,
        0px 4px 0px #000000,
        0px 6px 0px #000000,
        0px 8px 0px #000000,
        0px 10px 0px #000000,
        0px 14px 20px rgba(0, 0, 0, 0.85);
      word-break: keep-all;
      letter-spacing: -1px;
      line-height: 1.1;
      padding: 10px;
    }
    """

def generate_hero_word_animation(word_id: str, start: float, end: float, color: str = "#FFE600") -> str:
    """GSAP animation instructions for a razor-sharp 3D hero climax word."""
    dur = max(0.25, end - start)
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', word_id)
    return f"""
      // Razor-Sharp 3D Hero Climax Word: {word_id}
      const heroEl_{v_id} = document.getElementById('hero_{v_id}');
      if (heroEl_{v_id}) {{
        tl.set(heroEl_{v_id}, {{ display: 'block', color: '{color}' }}, {start});
        
        // Snappy 3D Optical Slam
        tl.fromTo(heroEl_{v_id}, 
          {{ opacity: 0, scale: 1.8, y: 40, rotationX: 18, rotationY: -10 }},
          {{ opacity: 1, scale: 1.08, y: -6, rotationX: 6, rotationY: -2, duration: {min(0.22, dur * 0.4)}, ease: 'back.out(2.5)', immediateRender: false }},
          {start}
        );
        
        // Settle into rest position
        tl.to(heroEl_{v_id},
          {{ scale: 1.0, y: 0, rotationX: 0, rotationY: 0, duration: {min(0.16, dur * 0.35)}, ease: 'power2.out' }},
          {start + min(0.22, dur * 0.4)}
        );
        
        // Crisp exit snap
        tl.to(heroEl_{v_id},
          {{ opacity: 0, scale: 0.9, y: -20, duration: 0.12, ease: 'power3.in' }},
          {end - 0.12}
        );
        tl.set(heroEl_{v_id}, {{ display: 'none' }}, {end});
      }}
    """
