import re
from typing import List, Dict, Any
from motion_spec import PhraseIntent, WordIntent, Archetype

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

def calculate_semantic_weight(text: str, index: int, total_words: int, duration: float) -> float:
    """Estimates semantic importance based on length, position, and duration."""
    clean_text = re.sub(r'[^\w\s]', '', text).strip()
    length_weight = min(1.0, len(clean_text) / 7.0)
    
    # Longer spoken durations usually signify emphasis
    duration_weight = min(1.0, duration / 0.45)
    
    # Hook words (first 3 words) and climax words (near end of phrases) get natural boosts
    position_bonus = 0.2 if index < 3 or index > total_words - 4 else 0.0
    
    # All-caps or exclamatory markers
    emphasis_bonus = 0.25 if text.isupper() and len(clean_text) > 1 else 0.0
    
    score = (length_weight * 0.4) + (duration_weight * 0.4) + position_bonus + emphasis_bonus
    return min(1.0, max(0.1, score))

def build_adaptive_phrases(
    raw_words: List[Dict[str, Any]],
    archetype: Archetype = "viral"
) -> List[PhraseIntent]:
    """
    Intelligently chunks words into dynamic spoken phrase blocks (1 to 4 words)
    based on pause boundaries (>280ms), WPS velocity, punctuation, and semantic rhythm.
    """
    if not raw_words:
        return []

    overall_wps = analyze_speech_cadence(raw_words)
    # Fast speakers get slightly longer chunks (3-4 words) for readability; slow/punchy gets 1-2 words.
    max_chunk_size = 4 if overall_wps > 3.2 else (2 if archetype in ["viral", "tech"] else 3)
    pause_threshold = 0.28 if archetype == "viral" else 0.38

    phrases: List[PhraseIntent] = []
    current_words: List[WordIntent] = []

    total_count = len(raw_words)

    for i, raw_w in enumerate(raw_words):
        w_id = str(raw_w.get("id", f"w_{i}"))
        w_text = (raw_w.get("text") or raw_w.get("word") or "").strip()
        w_start = float(raw_w.get("start", 0))
        w_end = float(raw_w.get("end", 0))
        w_dur = max(0.05, w_end - w_start)

        weight = calculate_semantic_weight(w_text, i, total_count, w_dur)

        # Classify visual and motion intent
        if weight > 0.82:
            v_intent = "hero"
            m_intent = "slam"
            climax = "3dExtrude" if archetype in ["cinematic", "viral"] else "shaderDistort"
        elif weight > 0.60:
            v_intent = "emphasis"
            m_intent = "elasticPop"
            climax = "none"
        else:
            v_intent = "standard"
            m_intent = "karaokeGlow"
            climax = "none"

        word_intent = WordIntent(
            id=w_id,
            text=w_text,
            start=w_start,
            end=w_end,
            semantic_weight=weight,
            visual_intent=v_intent,
            motion_intent=m_intent,
            climax_treatment=climax,
        )
        current_words.append(word_intent)

        # Check split conditions
        gap_to_next = 0.0
        if i < total_count - 1:
            gap_to_next = float(raw_words[i + 1].get("start", 0)) - w_end

        has_pause = gap_to_next >= pause_threshold
        has_punct = is_punctuation_split(w_text)
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
