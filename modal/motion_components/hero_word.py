import re

"""
HeroWord Component: 3D Punch and Climax Typography
Placed in Z-depth plane behind speaker cutout with 3D perspective projection,
volumetric extruded depth, and optical slam-zoom.
"""

def generate_hero_word_css() -> str:
    return """
    .hero-stage {
      position: absolute;
      top: 380px;
      left: 40px;
      width: 1000px;
      height: 480px;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      z-index: 30;
      pointer-events: none;
      perspective: 900px;
      transform-style: preserve-3d;
    }

    .hero-word-item {
      font-family: 'Montserrat', 'Noto Sans Telugu', sans-serif;
      font-size: 130px;
      font-weight: 900;
      color: #FFE600;
      text-transform: uppercase;
      opacity: 0;
      display: none;
      transform: scale(0.6) rotateX(10deg) rotateY(-6deg);
      -webkit-text-stroke: 4px #000000;
      text-shadow: 
        0 1px 0 #FFFFFF,
        0 2px 0 #E2E8F0,
        0 3px 0 #CBD5E1,
        0 4px 0 #94A3B8,
        0 6px 0 #64748B,
        0 8px 1px rgba(0,0,0,0.4),
        0 12px 32px rgba(0,0,0,0.9),
        0 0 60px rgba(255, 230, 0, 0.85);
      word-break: keep-all;
      letter-spacing: -2px;
      line-height: 1.1;
      padding: 20px;
    }
    """

def generate_hero_word_animation(word_id: str, start: float, end: float, color: str = "#FFE600") -> str:
    """GSAP animation instructions for a 3D hero climax word."""
    dur = max(0.2, end - start)
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', word_id)
    return f"""
      // 3D Hero Climax Word: {word_id}
      const heroEl_{v_id} = document.getElementById('hero_{v_id}');
      if (heroEl_{v_id}) {{
        tl.set(heroEl_{v_id}, {{ display: 'block', color: '{color}', textShadow: '0 1px 0 #FFF, 0 2px 0 #CBD5E1, 0 4px 0 #64748B, 0 8px 1px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.9), 0 0 60px {color}' }}, {start});
        
        // Slam zoom in with 3D perspective
        tl.fromTo(heroEl_{v_id}, 
          {{ opacity: 0, scale: 2.2, y: 60, rotationX: 25, rotationY: -15, filter: 'blur(12px)' }},
          {{ opacity: 1, scale: 1.12, y: -10, rotationX: 8, rotationY: -4, filter: 'blur(0px)', duration: {min(0.24, dur * 0.4)}, ease: 'back.out(2.5)' }},
          {start}
        );
        
        // Settle & subtle ambient float
        tl.to(heroEl_{v_id},
          {{ scale: 1.0, y: 0, rotationX: 0, rotationY: 0, duration: {min(0.18, dur * 0.35)}, ease: 'power2.out' }},
          {start + min(0.24, dur * 0.4)}
        );
        
        // Exit snap
        tl.to(heroEl_{v_id},
          {{ opacity: 0, scale: 0.85, y: -30, filter: 'blur(8px)', duration: 0.12, ease: 'power3.in' }},
          {end - 0.12}
        );
        tl.set(heroEl_{v_id}, {{ display: 'none' }}, {end});
      }}
    """
