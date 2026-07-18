import pytest
from pydantic import ValidationError
from composition_engine.models.payload import RenderPayload, Segment, Word
from composition_engine.models.scene_graph import compile_scene_graph

# Setup a clean base test payload dictionary
BASE_PAYLOAD = {
    "version": 3,
    "projectId": "24f5e5a4-0edf-4fdb-a08d-66c4cdb74f34",
    "dimensions": {"width": 1080, "height": 1920},
    "fps": 30,
    "backgroundVideo": {
        "url": "https://example.com/background.mp4",
        "duration": 10.0,
        "trim": {"start": 0.0, "end": 10.0}
    },
    "subtitleStyle": {
        "_version": 3,
        "font": {
            "family": "Inter",
            "weight": 700,
            "italic": False,
            "underline": False,
            "textTransform": "none"
        },
        "fontSize": 24,
        "textColor": {"mode": "solid", "solid": "#FFFFFF"},
        "stroke": {"enabled": False, "color": "#000000", "width": 0.0},
        "shadow": {"color": "rgba(0,0,0,0.5)", "blur": 0.0, "offsetX": 0.0, "offsetY": 0.0},
        "background": {"enabled": False, "color": "rgba(0,0,0,0.75)", "opacity": 1.0, "paddingX": 0.0, "paddingY": 0.0, "borderRadius": 0.0},
        "alignment": "center",
        "positionX": 0.0,
        "positionY": 0.0,
        "highlightMode": "none",
        "activeWordColor": "#FFFFFF",
        "inactiveOpacity": 0.5,
        "transition": {
            "type": "none",
            "target": "word",
            "speedMode": "dynamic",
            "speed": 25
        },
        "overrides": {
            "wordStyles": {},
            "segmentStyles": {}
        }
    },
    "segments": [
        {
            "id": 1,
            "start": 0.0,
            "end": 2.0,
            "text": "Hello world",
            "words": [
                {"id": "w1", "word": "Hello", "start": 0.0, "end": 1.0},
                {"id": "w2", "word": "world", "start": 1.0, "end": 2.0}
            ]
        }
    ]
}

def test_valid_payload_parsing():
    """Verify that a valid RenderPayload dict is parsed successfully."""
    payload = RenderPayload(**BASE_PAYLOAD)
    assert payload.projectId == "24f5e5a4-0edf-4fdb-a08d-66c4cdb74f34"
    assert len(payload.segments) == 1
    assert len(payload.segments[0].words) == 2

def test_word_timing_error():
    """Verify that a word start time exceeding end time raises ValidationError."""
    bad_payload = dict(BASE_PAYLOAD)
    bad_payload["segments"] = [
        {
            "id": 1,
            "start": 0.0,
            "end": 2.0,
            "text": "Hello world",
            "words": [
                {"id": "w1", "word": "Hello", "start": 1.5, "end": 1.0}, # Bad timing
                {"id": "w2", "word": "world", "start": 1.0, "end": 2.0}
            ]
        }
    ]
    with pytest.raises(ValidationError) as excinfo:
        RenderPayload(**bad_payload)
    assert "start time 1.5 exceeds end time 1.0" in str(excinfo.value)

def test_word_segment_boundary_overflow():
    """Verify that a word starting before or ending after parent segment raises ValidationError."""
    bad_payload = dict(BASE_PAYLOAD)
    bad_payload["segments"] = [
        {
            "id": 1,
            "start": 0.5, # Segment starts at 0.5
            "end": 2.0,
            "text": "Hello world",
            "words": [
                {"id": "w1", "word": "Hello", "start": 0.0, "end": 1.0}, # Word starts at 0.0 (out of bounds)
                {"id": "w2", "word": "world", "start": 1.0, "end": 2.0}
            ]
        }
    ]
    with pytest.raises(ValidationError) as excinfo:
        RenderPayload(**bad_payload)
    assert "overflows parent segment timing" in str(excinfo.value)

def test_style_cascade_resolution():
    """Verify styling resolution cascade: Project base -> Segment override -> Word override."""
    cascade_payload = dict(BASE_PAYLOAD)
    cascade_payload["subtitleStyle"] = dict(BASE_PAYLOAD["subtitleStyle"])
    cascade_payload["subtitleStyle"]["overrides"] = {
        "segmentStyles": {
            1: {"fontFamily": "SegmentFont", "fontSize": 30.0} # Segment override
        },
        "wordStyles": {
            "w2": {"fontFamily": "WordFont", "textColor": "#FF0000"} # Word override
        }
    }
    
    payload = RenderPayload(**cascade_payload)
    comp = compile_scene_graph(payload)
    
    sub_track = next(t for t in comp.tracks if t.id == "track_subtitles")
    seg_node = sub_track.clips[0]
    
    # Word 1: should inherit base style weight, but take SegmentFont and size 30.0 from segment overrides
    w1_node = seg_node.words[0]
    assert w1_node.style.fontFamily == "SegmentFont"
    assert w1_node.style.fontSize == 30.0
    assert w1_node.style.fontWeight == 700 # Base inherited
    assert w1_node.style.textColor == "#FFFFFF" # Base inherited
    
    # Word 2: should override fontFamily to WordFont, textColor to #FF0000, and inherit size 30.0 from segment
    w2_node = seg_node.words[1]
    assert w2_node.style.fontFamily == "WordFont"
    assert w2_node.style.textColor == "#FF0000"
    assert w2_node.style.fontSize == 30.0 # Inherited from segment override
    assert w2_node.style.fontWeight == 700 # Base inherited
