from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from composition_engine.models.payload import RenderPayload, SubtitleStyleV3, WordStyleOverride, SegmentStyleOverride

class ResolvedWordStyle(BaseModel):
    fontFamily: str = "Inter"
    fontWeight: int = 700
    fontSize: float = 24.0
    italic: bool = False
    underline: bool = False
    textTransform: str = "none"
    letterSpacing: float = 0.0
    textColor: str = "#FFFFFF"
    gradient: Optional[Dict[str, Any]] = None
    strokeColor: str = "#000000"
    strokeWidth: float = 0.0
    shadowColor: str = "rgba(0,0,0,0.5)"
    shadowBlur: float = 0.0
    shadowOffsetX: float = 0.0
    shadowOffsetY: float = 0.0
    backgroundColor: str = "transparent"
    borderRadius: float = 0.0
    borderWidth: float = 0.0
    borderColor: str = "transparent"
    paddingX: float = 0.0
    paddingY: float = 0.0
    x: float = 0.0
    y: float = 0.0
    rotation: float = 0.0
    scaleX: float = 1.0
    scaleY: float = 1.0
    opacity: float = 1.0
    animation: str = "none"
    animationDelay: float = 0.0
    animationDuration: float = 0.0
    emoji: Optional[str] = None

class SceneNode(BaseModel):
    type: str
    id: str

class VideoClipNode(SceneNode):
    type: str = "video_clip"
    url: str
    start: float
    duration: float
    trim_start: float = 0.0
    trim_end: float = 0.0
    volume: float = 1.0

class AudioClipNode(SceneNode):
    type: str = "audio_clip"
    url: str
    start: float
    duration: float
    trim_start: float = 0.0
    trim_end: float = 0.0
    volume: float = 1.0

class SubtitleWordNode(SceneNode):
    type: str = "subtitle_word"
    word: str
    start: float
    end: float
    style: ResolvedWordStyle

class SubtitleSegmentNode(SceneNode):
    type: str = "subtitle_segment"
    start: float
    end: float
    text: str
    words: List[SubtitleWordNode] = Field(default_factory=list)

class TrackNode(SceneNode):
    type: str = "track"
    name: str
    clips: List[SceneNode] = Field(default_factory=list)

class CompositionNode(SceneNode):
    type: str = "composition"
    width: int
    height: int
    fps: int
    duration: float
    tracks: List[TrackNode] = Field(default_factory=list)

def resolve_style(
    style: SubtitleStyleV3,
    seg_id: int,
    word_id: str
) -> ResolvedWordStyle:
    # 1. Base Project Styles
    res = {
        "fontFamily": style.font.family,
        "fontWeight": style.font.weight,
        "fontSize": style.fontSize,
        "italic": style.font.italic,
        "underline": style.font.underline,
        "textTransform": style.font.textTransform,
        "letterSpacing": style.letterSpacing,
        "textColor": style.textColor.solid if style.textColor.mode == "solid" else "#FFFFFF",
        "gradient": style.textColor.model_dump() if style.textColor.mode == "gradient" else None,
        "strokeColor": style.stroke.color if style.stroke.enabled else "transparent",
        "strokeWidth": style.stroke.width if style.stroke.enabled else 0.0,
        "shadowColor": style.shadow.color,
        "shadowBlur": style.shadow.blur,
        "shadowOffsetX": style.shadow.offsetX,
        "shadowOffsetY": style.shadow.offsetY,
        "backgroundColor": style.background.color if style.background.enabled else "transparent",
        "borderRadius": style.background.borderRadius if style.background.enabled else 0.0,
        "paddingX": style.background.paddingX if style.background.enabled else 0.0,
        "paddingY": style.background.paddingY if style.background.enabled else 0.0,
        "opacity": 1.0,
        "animation": style.transition.type,
    }

    # 2. Merge Segment-Level Overrides
    seg_override = style.overrides.segmentStyles.get(seg_id)
    if seg_override:
        for k, v in seg_override.model_dump(exclude_unset=True).items():
            if v is not None:
                res[k] = v

    # 3. Merge Word-Level Overrides
    word_override = style.overrides.wordStyles.get(word_id)
    if word_override:
        for k, v in word_override.model_dump(exclude_unset=True).items():
            if v is not None:
                res[k] = v

    return ResolvedWordStyle(**res)

def compile_scene_graph(payload: RenderPayload) -> CompositionNode:
    # Compile Video Track
    bg_video = payload.backgroundVideo
    duration = bg_video.duration
    trim_start = bg_video.trim.start if bg_video.trim else 0.0
    trim_end = bg_video.trim.end if bg_video.trim else 0.0
    
    video_clip = VideoClipNode(
        id=f"bg_video_{payload.projectId}",
        url=bg_video.url,
        start=0.0,
        duration=duration,
        trim_start=trim_start,
        trim_end=trim_end
    )
    video_track = TrackNode(id="track_video_bg", name="background_video", clips=[video_clip])

    # Compile Subtitle Track
    subtitle_clips = []
    for seg in payload.segments:
        words = []
        for w in seg.words:
            word_style = resolve_style(payload.subtitleStyle, seg.id, w.id)
            word_node = SubtitleWordNode(
                id=w.id,
                word=w.word,
                start=w.start,
                end=w.end,
                style=word_style
            )
            words.append(word_node)
            
        seg_node = SubtitleSegmentNode(
            id=f"seg_{seg.id}",
            start=seg.start,
            end=seg.end,
            text=seg.text,
            words=words
        )
        subtitle_clips.append(seg_node)
        
    subtitle_track = TrackNode(id="track_subtitles", name="subtitles", clips=subtitle_clips)

    return CompositionNode(
        id=payload.projectId,
        width=payload.dimensions.width,
        height=payload.dimensions.height,
        fps=payload.fps,
        duration=duration,
        tracks=[video_track, subtitle_track]
    )
