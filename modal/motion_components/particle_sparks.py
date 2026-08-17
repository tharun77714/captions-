import math
import re
from typing import List

"""
ParticleSparks Component: Deterministic Dual-Tier Particle VFX
- Small DOM spark dots & radial shockwave rings for Emphasis hits (~15%)
- Positioned around the bottom caption rail (Y=1420px), NEVER over the presenter's face
- Strict display: none lifecycle with immediateRender: false to avoid phantom static orbs
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
      width: 8px;
      height: 8px;
      border-radius: 50%;
      opacity: 0;
      display: none;
      transform: translate(-50%, -50%) scale(0);
      pointer-events: none;
      box-shadow: 0 0 12px currentColor;
    }

    .shockwave-ring {
      position: absolute;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 3px solid #FFE600;
      opacity: 0;
      display: none;
      transform: translate(-50%, -50%) scale(0.2);
      pointer-events: none;
      box-shadow: 0 0 20px currentColor;
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
    Uses strict display: none -> block -> none and immediateRender: false.
    """
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', word_id)
    spark_count = 14 if is_hero else 8
    radius = 120 if is_hero else 75
    dur = 0.30 if is_hero else 0.22

    lines: List[str] = [
        f"// Particle Spark Burst for {word_id}",
        f"tl.set('#ring_{v_id}', {{ display: 'block' }}, {start});",
        f"tl.fromTo('#ring_{v_id}',",
        f"  {{ opacity: 0.9, scale: 0.15, borderColor: '{color}', boxShadow: '0 0 24px {color}' }},",
        f"  {{ opacity: 0, scale: {2.8 if is_hero else 1.8}, duration: {dur + 0.08}, ease: 'power2.out', immediateRender: false }},",
        f"  {start}",
        f");",
        f"tl.set('#ring_{v_id}', {{ display: 'none' }}, {start + dur + 0.1});"
    ]

    for p in range(spark_count):
        angle = (p / float(spark_count)) * math.pi * 2.0
        dist = radius * (0.7 + (p % 3) * 0.25)
        dx = round(math.cos(angle) * dist, 1)
        dy = round(math.sin(angle) * dist, 1)

        lines.append(f"""
        tl.set('#spark_{v_id}_{p}', {{ display: 'block' }}, {start});
        tl.fromTo('#spark_{v_id}_{p}',
          {{ opacity: 1, scale: {1.4 if is_hero else 1.0}, x: 0, y: 0, backgroundColor: '{color}' }},
          {{ opacity: 0, scale: 0.2, x: {dx}, y: {dy}, duration: {dur}, ease: 'power3.out', immediateRender: false }},
          {start}
        );
        tl.set('#spark_{v_id}_{p}', {{ display: 'none' }}, {start + dur});
        """)

    return "\n".join(lines)

def generate_spark_dom_elements(word_id: str, color: str = "#FFE600", is_hero: bool = False) -> str:
    """Generates the DOM elements for sparks and shockwave ring around caption rail."""
    v_id = re.sub(r'[^a-zA-Z0-9_]', '_', word_id)
    spark_count = 14 if is_hero else 8
    
    # Placed at the caption rail (top: 1420px, left: 50%) — NEVER over presenter's face
    base_top = "1420px"
    base_left = "50%"

    elements = [
        f'<div id="ring_{v_id}" class="shockwave-ring" style="top: {base_top}; left: {base_left}; border-color: {color};"></div>'
    ]
    for p in range(spark_count):
        elements.append(
            f'<div id="spark_{v_id}_{p}" class="spark-dot" style="top: {base_top}; left: {base_left}; color: {color};"></div>'
        )

    return "\n".join(elements)
