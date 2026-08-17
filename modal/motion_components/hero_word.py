"""
HeroWord Component: 3D Punch and Climax Typography
Placed in Z-depth plane behind speaker cutout with volumetric shadow and elastic entrance.
"""

def generate_hero_word_css() -> str:
    return """
    .hero-stage {
      position: absolute;
      top: 20%;
      left: 6%;
      width: 88%;
      height: 32%;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      z-index: 30;
      pointer-events: none;
    }

    .hero-word-item {
      font-family: 'Montserrat', 'Noto Sans Telugu', sans-serif;
      font-size: 112px;
      font-weight: 900;
      color: #FFE600;
      text-transform: uppercase;
      opacity: 0;
      display: none;
      transform: scale(0.6) rotate(-2deg);
      -webkit-text-stroke: 4px #000000;
      text-shadow: 0 12px 48px rgba(0, 0, 0, 0.95), 0 0 60px rgba(255, 230, 0, 0.7);
      word-break: keep-all;
      letter-spacing: -2px;
    }
    """

def generate_hero_word_animation(word_id: str, start: float, end: float) -> str:
    """GSAP animation instructions for a hero climax word."""
    dur = max(0.15, end - start)
    return f"""
      const heroEl_{word_id} = document.getElementById('hero_{word_id}');
      if (heroEl_{word_id}) {{
        tl.set(heroEl_{word_id}, {{ display: 'block' }}, {start});
        tl.fromTo(heroEl_{word_id}, 
          {{ opacity: 0, scale: 0.5, y: 40, rotation: -3, filter: 'blur(8px)' }},
          {{ opacity: 1, scale: 1.15, y: -10, rotation: 0, filter: 'blur(0px)', duration: {min(0.22, dur * 0.4)}, ease: 'back.out(2.5)' }},
          {start}
        );
        tl.to(heroEl_{word_id},
          {{ scale: 1.0, y: 0, duration: {min(0.15, dur * 0.3)}, ease: 'power2.out' }},
          {start + min(0.22, dur * 0.4)}
        );
        tl.to(heroEl_{word_id},
          {{ opacity: 0, scale: 0.85, y: -20, filter: 'blur(6px)', duration: 0.12, ease: 'power3.in' }},
          {end - 0.12}
        );
        tl.set(heroEl_{word_id}, {{ display: 'none' }}, {end});
      }}
    """
