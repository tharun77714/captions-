from typing import Dict, Any, List, Optional, Literal, Union
from pydantic import BaseModel, Field, field_validator, model_validator
import uuid

class FontConfig(BaseModel):
    family: str = "Inter"
    weight: int = Field(700, ge=100, le=900)
    italic: bool = False
    underline: bool = False
    textTransform: Literal["none", "uppercase", "lowercase", "capitalize"] = "none"

class ColorConfig(BaseModel):
    mode: Literal["solid", "gradient"] = "solid"
    solid: str = "#FFFFFF"
    gradientFrom: Optional[str] = None
    gradientTo: Optional[str] = None
    gradientAngle: Optional[int] = Field(90, ge=0, le=360)

class StrokeConfig(BaseModel):
    enabled: bool = False
    color: str = "#000000"
    width: float = Field(0.0, ge=0.0, le=10.0)

class ShadowConfig(BaseModel):
    color: str = "rgba(0,0,0,0.5)"
    blur: float = Field(0.0, ge=0.0, le=50.0)
    offsetX: float = 0.0
    offsetY: float = 0.0

class BackgroundConfig(BaseModel):
    enabled: bool = False
    color: str = "rgba(0,0,0,0.75)"
    opacity: float = Field(1.0, ge=0.0, le=1.0)
    paddingX: float = Field(0.0, ge=0.0)
    paddingY: float = Field(0.0, ge=0.0)
    borderRadius: float = Field(0.0, ge=0.0)

class TransitionConfig(BaseModel):
    type: Literal[
        "none", "fade", "pop", "scale", "slide-left", "slide-right",
        "slide-up", "slide-down", "zoom", "flip-x", "flip-y", "spin",
        "blur", "bounce", "elastic"
    ] = "none"
    target: Literal["word", "line"] = "word"
    speedMode: Literal["dynamic", "fixed"] = "dynamic"
    speed: int = Field(25, ge=0, le=50)

class GradientStop(BaseModel):
    color: str
    position: float = Field(..., ge=0.0, le=100.0)

class GradientConfig(BaseModel):
    type: Literal["linear", "radial"] = "linear"
    angle: float = Field(90.0, ge=0.0, le=360.0)
    stops: List[GradientStop]

class WordStyleOverride(BaseModel):
    fontFamily: Optional[str] = None
    fontWeight: Optional[int] = Field(None, ge=100, le=900)
    fontSize: Optional[float] = Field(None, ge=10.0, le=200.0)
    italic: Optional[bool] = None
    underline: Optional[bool] = None
    textTransform: Optional[Literal["none", "uppercase", "lowercase", "capitalize"]] = None
    letterSpacing: Optional[float] = None
    textColor: Optional[str] = None
    gradient: Optional[GradientConfig] = None
    strokeColor: Optional[str] = None
    strokeWidth: Optional[float] = Field(None, ge=0.0, le=10.0)
    shadowColor: Optional[str] = None
    shadowBlur: Optional[float] = Field(None, ge=0.0, le=50.0)
    shadowOffsetX: Optional[float] = None
    shadowOffsetY: Optional[float] = None
    backgroundColor: Optional[str] = None
    backgroundGradient: Optional[GradientConfig] = None
    borderRadius: Optional[float] = Field(None, ge=0.0)
    borderWidth: Optional[float] = Field(None, ge=0.0)
    borderColor: Optional[str] = None
    paddingX: Optional[float] = Field(None, ge=0.0)
    paddingY: Optional[float] = Field(None, ge=0.0)
    x: Optional[float] = None
    y: Optional[float] = None
    rotation: Optional[float] = None
    scaleX: Optional[float] = None
    scaleY: Optional[float] = None
    opacity: Optional[float] = Field(None, ge=0.0, le=1.0)
    animation: Optional[str] = None
    animationDelay: Optional[float] = None
    animationDuration: Optional[float] = None
    emoji: Optional[str] = None

class SegmentStyleOverride(BaseModel):
    fontFamily: Optional[str] = None
    fontWeight: Optional[int] = Field(None, ge=100, le=900)
    fontSize: Optional[float] = Field(None, ge=10.0, le=200.0)
    italic: Optional[bool] = None
    underline: Optional[bool] = None
    textTransform: Optional[Literal["none", "uppercase", "lowercase", "capitalize"]] = None
    letterSpacing: Optional[float] = None
    textColor: Optional[str] = None
    gradient: Optional[GradientConfig] = None
    strokeColor: Optional[str] = None
    strokeWidth: Optional[float] = Field(None, ge=0.0, le=10.0)
    shadowColor: Optional[str] = None
    shadowBlur: Optional[float] = Field(None, ge=0.0, le=50.0)
    shadowOffsetX: Optional[float] = None
    shadowOffsetY: Optional[float] = None
    backgroundColor: Optional[str] = None
    backgroundGradient: Optional[GradientConfig] = None
    borderRadius: Optional[float] = Field(None, ge=0.0)
    borderWidth: Optional[float] = Field(None, ge=0.0)
    borderColor: Optional[str] = None
    paddingX: Optional[float] = Field(None, ge=0.0)
    paddingY: Optional[float] = Field(None, ge=0.0)
    x: Optional[float] = None
    y: Optional[float] = None
    rotation: Optional[float] = None
    scaleX: Optional[float] = None
    scaleY: Optional[float] = None
    opacity: Optional[float] = Field(None, ge=0.0, le=1.0)
    animation: Optional[str] = None
    animationDelay: Optional[float] = None
    animationDuration: Optional[float] = None

class StyleOverrides(BaseModel):
    wordStyles: Dict[str, WordStyleOverride] = Field(default_factory=dict)
    segmentStyles: Dict[int, SegmentStyleOverride] = Field(default_factory=dict)

class SubtitleStyleV3(BaseModel):
    version: Literal[3] = Field(3, alias="_version")
    font: FontConfig = Field(default_factory=FontConfig)
    fontSize: float = Field(24.0, ge=12.0, le=72.0)
    letterSpacing: float = Field(0.0, ge=-5.0, le=20.0)
    wordSpacing: float = Field(0.0, ge=-5.0, le=20.0)
    lineSpacing: float = Field(1.2, ge=0.8, le=3.0)
    textColor: ColorConfig = Field(default_factory=ColorConfig)
    stroke: StrokeConfig = Field(default_factory=StrokeConfig)
    shadow: ShadowConfig = Field(default_factory=ShadowConfig)
    background: BackgroundConfig = Field(default_factory=BackgroundConfig)
    blur: float = Field(0.0, ge=0.0, le=50.0)
    alignment: Literal["left", "center", "right"] = "center"
    positionX: float = Field(0.0, ge=-50.0, le=50.0)
    positionY: float = Field(0.0, ge=-50.0, le=50.0)
    highlightMode: Literal["none", "color", "scale", "underline", "background", "karaoke"] = "none"
    activeWordColor: str = "#FFFFFF"
    inactiveOpacity: float = Field(0.5, ge=0.0, le=1.0)
    transition: TransitionConfig = Field(default_factory=TransitionConfig)
    overrides: StyleOverrides = Field(default_factory=StyleOverrides)

    model_config = {
        "populate_by_name": True
    }

class Word(BaseModel):
    id: str
    word: str
    start: float = Field(..., ge=0.0)
    end: float = Field(..., ge=0.0)
    probability: Optional[float] = None

    @model_validator(mode="after")
    def validate_timings(self) -> "Word":
        if self.start > self.end:
            raise ValueError(f"Word '{self.word}' start time {self.start} exceeds end time {self.end}")
        return self

class Segment(BaseModel):
    id: int
    start: float = Field(..., ge=0.0)
    end: float = Field(..., ge=0.0)
    text: str
    words: List[Word]

    @model_validator(mode="after")
    def validate_segment_boundaries(self) -> "Segment":
        if self.start > self.end:
            raise ValueError(f"Segment {self.id} start time {self.start} exceeds end time {self.end}")
        for w in self.words:
            if w.start < self.start or w.end > self.end:
                raise ValueError(f"Word '{w.word}' timing [{w.start}, {w.end}] overflows parent segment timing [{self.start}, {self.end}]")
        return self

class Dimensions(BaseModel):
    width: int = Field(1080, ge=100)
    height: int = Field(1920, ge=100)

class VideoTrim(BaseModel):
    start: float = Field(0.0, ge=0.0)
    end: float = Field(0.0, ge=0.0)

class BackgroundVideo(BaseModel):
    url: str
    duration: float = Field(..., ge=0.0)
    trim: Optional[VideoTrim] = None

class RenderPayload(BaseModel):
    version: int = Field(3, ge=3)
    projectId: str
    dimensions: Dimensions = Field(default_factory=Dimensions)
    fps: int = Field(30, ge=1)
    backgroundVideo: BackgroundVideo
    subtitleStyle: SubtitleStyleV3
    segments: List[Segment]
    audioTracks: Optional[List[Dict[str, Any]]] = None
    videoTracks: Optional[List[Dict[str, Any]]] = None
    subtitleTracks: Optional[List[Dict[str, Any]]] = None
    overlayTracks: Optional[List[Dict[str, Any]]] = None
