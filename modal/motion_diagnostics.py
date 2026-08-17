from typing import Dict, Any, List
from motion_spec import MotionIntentSpec

def audit_motion_density(spec: MotionIntentSpec) -> Dict[str, Any]:
    """
    Audits the motion specification against archetype expectations
    to detect unintentional dead zones or lack of visual rhythm.
    """
    total_duration = spec.duration_seconds
    total_phrases = len(spec.phrases)
    total_words = sum(len(p.words) for p in spec.phrases)

    max_allowed_dead_zone = 2.5 if spec.archetype in ["luxury", "editorial"] else 1.2
    
    dead_zones: List[Dict[str, float]] = []
    
    for i in range(len(spec.phrases) - 1):
        gap = spec.phrases[i + 1].start - spec.phrases[i].end
        if gap > max_allowed_dead_zone:
            dead_zones.append({
                "from_phrase": spec.phrases[i].id,
                "gap_seconds": round(gap, 2)
            })

    # Count motion primitives
    hero_count = len(spec.hero_word_ids)
    
    is_valid = len(dead_zones) == 0 and total_words > 0

    return {
        "is_valid": is_valid,
        "archetype": spec.archetype,
        "total_duration": total_duration,
        "total_phrases": total_phrases,
        "total_words": total_words,
        "hero_count": hero_count,
        "dead_zones": dead_zones
    }
