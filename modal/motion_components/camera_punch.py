from motion_spec import Archetype

"""
CameraPunch Component: Cinematic Camera Punch & Micro-Shake
Applies synchronized optical punch-zooms and camera shake to the background plate
to give physical weight and momentum to spoken hero beats.
"""

def generate_camera_punch_animation(
    start: float,
    archetype: Archetype = "viral",
    intensity: float = 1.0
) -> str:
    """
    Generates deterministic GSAP camera punch-zoom and micro-shake on #bg-video-layer.
    Uses immediateRender: false to avoid pre-rendering scale distortion before the hit.
    """
    if archetype == "editorial":
        return ""

    zoom_scale = 1.05 * intensity if archetype == "viral" else 1.025 * intensity
    duration = 0.22 if archetype == "viral" else 0.35

    return f"""
      // Camera Punch at {start}s
      tl.fromTo('#bg-video-layer',
        {{ scale: {zoom_scale}, x: -4, y: 3 }},
        {{ scale: 1.0, x: 0, y: 0, duration: {duration}, ease: 'power2.out', immediateRender: false }},
        {start}
      );
    """
