import re
from typing import List, Dict, Any, Optional
from motion_spec import PhraseIntent, WordIntent, Archetype

NEON_PALETTES = {
    "viral": ["#FFE600", "#39FF14", "#00F5FF", "#FF007F", "#FF8800"],
    "cinematic": ["#FFE600", "#FFD700", "#E0F2FE", "#FFFFFF", "#F59E0B"],
    "tech": ["#00F5FF", "#38BDF8", "#818CF8", "#A855F7", "#39FF14"],
    "luxury": ["#FFD700", "#FBBF24", "#F59E0B", "#FFFFFF", "#E2E8F0"],
    "editorial": ["#FFFFFF", "#FFE600", "#F43F5E", "#06B6D4", "#10B981"],
}

# Semantic triggers for hero words (numbers, currency, extreme superlatives, key concepts)
HERO_SEMANTIC_REGEX = re.compile(
    r'(\b\d+[\w%]*\b|\$|₹|€|£|million|billion|crore|lakh|insane|huge|secret|never|always|best|first|top|killer|magic|power|free|new|only|stop|danger|warning|చాలా|అద్భుతం|రహస్యం|మొదటి|ఉత్తమ|సూపర్|కోట్లు|లక్షలు)',
    re.IGNORECASE | re.UNICODE
)

def analyze_speech_cadence(words: List[Dict[str, Any]]) -> float:
    """Calculates overall Words Per Second (WPS)."""
    if not words:
        return 2.5
    total_duration = words[-1]["end"] - words[0]["start"]
    if total_duration <= 0:
        return 2.5
    return len(words) / total_duration

def is_punctuation_split(text: str) -> bool:
    """Checks if word ends in strong punctuation (.,!?:;)."""
    return bool(re.search(r'[.!?:;,\u0964\u0965]+$', text.strip()))

def calculate_semantic_score(
    text: str,
    duration: float,
    avg_duration: float,
    index: int,
    total_words: int
) -> float:
    """
    Computes a normalized semantic energy score (0.0 to 1.0).
    Considers word duration compared to average, regex semantic triggers,
    all-caps, and structural position.
    """
    clean_text = re.sub(r'[^\w\s]', '', text).strip()
    if not clean_text:
        return 0.2

    score = 0.35  # Base score for standard words

    # 1. Duration outlier check (elongated words are often stressed)
    if avg_duration > 0:
        ratio = duration / avg_duration
        if ratio > 1.4:
            score += 0.25
        elif ratio > 1.15:
            score += 0.12

    # 2. Semantic keyword check
    if HERO_SEMANTIC_REGEX.search(text):
        score += 0.35

    # 3. All-caps or exclamation check
    if text.isupper() and len(clean_text) > 1:
        score += 0.20
    if '!' in text or '?' in text:
        score += 0.15

    # 4. First 2 words or last 2 words of a phrase
    if index < 2 or index >= total_words - 2:
        score += 0.10

    return min(1.0, score)

def build_adaptive_phrases(
    raw_words: List[Dict[str, Any]],
    archetype: Archetype = "viral"
) -> List[PhraseIntent]:
    """
    Intelligently chunks words into spoken phrase blocks (1 to 4 words)
    and classifies words into a disciplined 80/15/5 visual hierarchy:
    - ~80% Standard (kinetic flow, spring micro-motion, crisp outline)
    - ~15% Emphasis (elastic slam, vibrant neon color, SVG underline, spark burst)
    - 0–5% Hero (rare, semantic climax with 3D depth behind subject, particle explosion)
    """
    if not raw_words:
        return []

    overall_wps = analyze_speech_cadence(raw_words)
    max_chunk_size = 4 if overall_wps > 3.2 else (2 if archetype in ["viral", "tech"] else 3)
    pause_threshold = 0.28 if archetype == "viral" else 0.38

    # Calculate average word duration for anomaly detection
    durations = [max(0.05, float(w.get("end", 0)) - float(w.get("start", 0))) for w in raw_words]
    avg_duration = sum(durations) / max(1, len(durations))

    palette = NEON_PALETTES.get(archetype, NEON_PALETTES["viral"])
    palette_idx = 0

    total_count = len(raw_words)
    last_hero_time = -10.0  # Spacing tracker for hero words (min ~4.0s apart)

    # First pass: Score all words
    scored_words = []
    for i, raw_w in enumerate(raw_words):
        w_id = str(raw_w.get("id", f"w_{i}"))
        w_text = (raw_w.get("text") or raw_w.get("word") or "").strip()
        w_start = float(raw_w.get("start", 0))
        w_end = float(raw_w.get("end", 0))
        w_dur = max(0.05, w_end - w_start)

        score = calculate_semantic_score(w_text, w_dur, avg_duration, i, total_count)
        scored_words.append({
            "id": w_id,
            "text": w_text,
            "start": w_start,
            "end": w_end,
            "dur": w_dur,
            "score": score,
            "index": i
        })

    # Second pass: Apply 80/15/5 hierarchy with strict 5% hero ceiling
    classified_words: List[WordIntent] = []
    
    for item in scored_words:
        score = item["score"]
        w_start = item["start"]
        is_semantic_match = bool(HERO_SEMANTIC_REGEX.search(item["text"]))
        time_since_last_hero = w_start - last_hero_time

        # Hero criteria: high score (>= 0.75) + semantic trigger OR strong duration outlier, spaced >= 4.0s
        can_be_hero = (score >= 0.75 and (is_semantic_match or time_since_last_hero >= 6.0) and time_since_last_hero >= 4.0)

        if can_be_hero:
            v_intent = "hero"
            m_intent = "slam"
            climax = "3dExtrude"
            color = palette[palette_idx % len(palette)]
            palette_idx += 1
            last_hero_time = w_start
        elif score >= 0.55:
            v_intent = "emphasis"
            m_intent = "elasticPop"
            climax = "particleBurst" if archetype == "viral" else "none"
            color = palette[palette_idx % len(palette)]
            palette_idx += 1
        else:
            v_intent = "standard"
            m_intent = "karaokeGlow"
            climax = "none"
            color = "#FFFFFF"

        classified_words.append(
            WordIntent(
                id=item["id"],
                text=item["text"],
                start=item["start"],
                end=item["end"],
                semantic_weight=score,
                visual_intent=v_intent,
                motion_intent=m_intent,
                climax_treatment=climax,
                color_intent=color
            )
        )

    # Third pass: Chunk into spoken phrases
    phrases: List[PhraseIntent] = []
    current_words: List[WordIntent] = []

    for i, w_intent in enumerate(classified_words):
        current_words.append(w_intent)

        gap_to_next = 0.0
        if i < total_count - 1:
            gap_to_next = float(raw_words[i + 1].get("start", 0)) - w_intent.end

        has_pause = gap_to_next >= pause_threshold
        has_punct = is_punctuation_split(w_intent.text)
        is_max_size = len(current_words) >= max_chunk_size
        is_last_word = (i == total_count - 1)

        if has_pause or has_punct or is_max_size or is_last_word:
            p_id = f"phrase_{len(phrases)}"
            p_start = current_words[0].start
            p_end = current_words[-1].end
            
            phrases.append(
                PhraseIntent(
                    id=p_id,
                    start=p_start,
                    end=p_end,
                    words=current_words,
                    layout_position="bottom"
                )
            )
            current_words = []

    return phrases
