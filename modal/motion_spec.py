from dataclasses import dataclass, field
from typing import List, Optional, Literal, Dict, Any

Archetype = Literal["cinematic", "viral", "editorial", "luxury", "tech"]
VisualIntent = Literal["standard", "emphasis", "hero", "subtle"]
MotionIntent = Literal["slam", "elasticPop", "blurSweep", "karaokeGlow", "svgUnderline", "typewriter", "float", "none"]
ClimaxTreatment = Literal["3dExtrude", "shaderDistort", "cameraPunch", "particleBurst", "svgBurst", "none"]
RuntimeType = Literal["gsap", "three", "svg", "lottie", "css"]
DepthPlane = Literal["background", "behind_subject", "subject", "foreground_rail", "overlay_vfx", "camera_fx"]

@dataclass
class WordIntent:
    id: str
    text: str
    start: float
    end: float
    semantic_weight: float = 0.5  # 0.0 to 1.0
    visual_intent: VisualIntent = "standard"
    motion_intent: MotionIntent = "elasticPop"
    climax_treatment: ClimaxTreatment = "none"
    color_intent: Optional[str] = None
    custom_scale: Optional[float] = None

@dataclass
class PhraseIntent:
    id: str
    start: float
    end: float
    words: List[WordIntent]
    layout_position: Literal["bottom", "center", "top"] = "bottom"
    max_lines: int = 2

@dataclass
class ScenePhase:
    name: Literal["hook", "build", "climax", "reset"]
    start: float
    end: float
    energy_level: float  # 0.0 to 1.0

@dataclass
class MotionIntentSpec:
    composition_id: str
    width: int
    height: int
    duration_seconds: float
    fps: int = 30
    aspect_ratio: Literal["9:16", "1:1", "16:9"] = "9:16"
    archetype: Archetype = "viral"
    scene_phases: List[ScenePhase] = field(default_factory=list)
    phrases: List[PhraseIntent] = field(default_factory=list)
    hero_word_ids: List[str] = field(default_factory=list)
    enable_subject_separation: bool = True
    primary_color: str = "#FFFFFF"
    accent_color: str = "#FFE600"
    contrast_color: str = "#38BDF8"
    font_family: str = "Montserrat"
