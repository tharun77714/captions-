"""
SVGCallout Component: Hand-drawn SVG marker underlines and emphasis rings.
"""

def generate_svg_underline_html(word_id: str, width_px: int = 160) -> str:
    return f"""
    <svg id="svg_underline_{word_id}" class="svg-underline" width="{width_px}" height="24" viewBox="0 0 {width_px} 24" fill="none" style="position: absolute; bottom: -8px; left: 0; pointer-events: none; opacity: 0;">
      <path d="M 4 14 Q {width_px // 2} 22 {width_px - 4} 12" stroke="#FFE600" stroke-width="8" stroke-linecap="round" stroke-dasharray="{width_px * 2}" stroke-dashoffset="{width_px * 2}" />
    </svg>
    """

def generate_svg_underline_animation(word_id: str, start: float, end: float) -> str:
    dur = max(0.12, end - start)
    return f"""
      const svgUl_{word_id} = document.getElementById('svg_underline_{word_id}');
      if (svgUl_{word_id}) {{
        const path = svgUl_{word_id}.querySelector('path');
        tl.set(svgUl_{word_id}, {{ opacity: 1 }}, {start});
        tl.fromTo(path,
          {{ strokeDashoffset: 320 }},
          {{ strokeDashoffset: 0, duration: {min(0.18, dur * 0.5)}, ease: 'power2.out' }},
          {start}
        );
        tl.to(svgUl_{word_id},
          {{ opacity: 0, duration: 0.12, ease: 'power1.in' }},
          {end}
        );
      }}
    """
