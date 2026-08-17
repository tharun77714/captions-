import math
import re
from typing import List

"""
ParticleSparks Component: Deterministic Dual-Tier Particle VFX
- Small DOM spark dots & radial shockwave rings for Emphasis hits (~15%)
- High-density radial spark explosions for Hero climax hits (~5%)
All animated deterministically through GSAP virtual clock.
"""

def generate_particle_css() -> str:
    return """
    .vfx-stage {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 55;
      pointer-events: none;
      overflow: hidden;
    }

    .spark-dot {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      opacity: 0;
      transform: translate(-50%, -50%) scale(0);
      pointer-events: none;
      box-shadow: 0 0 16px currentColor, 0 0 32px currentColor;
    }

    .shockwave-ring {
      position: absolute;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      border: 4px solid #FFE600;
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.2);
      pointer-events: none;
      box-shadow: 0 0 32px currentColor, inset 0 0 20px currentColor;
    }
    """

def generate_spark_burst_animation(
    word_id: str,
    start: float,
    color: str = "#FFE600",
    is_hero: bool = False
) -> str:
    """
    Generates GSAP timeline animations for a radial burst of particle sparks & shockwave.
    Uses direct selectors to avoid variable collisions.
    """
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', word_id)
    spark_count = 20 if is_hero else 10
    radius = 180 if is_hero else 95
    dur = 0.35 if is_hero else 0.25

    lines: List[str] = [
        f"// Particle Spark Burst for {word_id}",
        f"tl.fromTo('#ring_{v_id}',",
        f"  {{ opacity: 0.95, scale: 0.15, borderColor: '{color}', boxShadow: '0 0 32px {color}' }},",
        f"  {{ opacity: 0, scale: {3.5 if is_hero else 2.2}, duration: {dur + 0.1}, ease: 'power2.out' }},",
        f"  {start}",
        f");"
    ]

    for p in range(spark_count):
        angle = (p / float(spark_count)) * math.pi * 2.0
        dist = radius * (0.7 + (p % 3) * 0.2)
        dx = round(math.cos(angle) * dist, 1)
        dy = round(math.sin(angle) * dist, 1)

        lines.append(f"""
        tl.fromTo('#spark_{v_id}_{p}',
          {{ opacity: 1, scale: {1.8 if is_hero else 1.2}, x: 0, y: 0, backgroundColor: '{color}' }},
          {{ opacity: 0, scale: 0.2, x: {dx}, y: {dy}, duration: {dur}, ease: 'power3.out' }},
          {start}
        );
        """)

    return "\n".join(lines)

def generate_spark_dom_elements(word_id: str, color: str = "#FFE600", is_hero: bool = False) -> str:
    """Generates the DOM elements for sparks and shockwave ring around a word."""
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', word_id)
    spark_count = 20 if is_hero else 10
    
    # Placed in the lower-third by default, or mid-screen for hero
    base_top = "72%" if not is_hero else "40%"
    base_left = "50%"

    elements = [
        f'<div id="ring_{v_id}" class="shockwave-ring" style="top: {base_top}; left: {base_left}; border-color: {color};"></div>'
    ]
    for p in range(spark_count):
        elements.append(
            f'<div id="spark_{v_id}_{p}" class="spark-dot" style="top: {base_top}; left: {base_left}; color: {color};"></div>'
        )

    return "\n".join(elements)
