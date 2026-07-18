import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
from enum import Enum
from composition_engine.models.payload import RenderPayload

@dataclass(frozen=True)
class Frame:
    frame_id: str
    frame_index: int
    presentation_timestamp: float
    capture_start_time: float
    capture_end_time: float
    capture_duration: float
    image_payload: bytes
    image_format: str
    image_width: int
    image_height: int
    byte_size: int
    sha256_hash: str


@dataclass(frozen=True)
class EngineConfig:
    max_queue_size: int = 16
    timeout_seconds: float = 30.0
    retry_limits: int = 3
    browser_headless: bool = True
    browser_args: List[str] = field(
        default_factory=lambda: [
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--force-color-profile=srgb",
            "--font-render-hinting=none"
        ]
    )
    output_fps: float = 30.0
    benchmark_enabled: bool = True
    debug_mode: bool = False


# ==============================================================================
# PIPELINE TIMELINE CLOCK
# ==============================================================================

class TimelineClock:
    def __init__(self, fps: float, duration: float, timebase: int = 90000):
        self.fps = fps
        self.duration = duration
        self.timebase = timebase

    def get_timestamp(self, frame_index: int) -> float:
        return frame_index / self.fps

    def timestamp_to_frame(self, timestamp: float) -> int:
        return round(timestamp * self.fps)

    def get_pts(self, frame_index: int) -> int:
        return int((frame_index / self.fps) * self.timebase)


# ==============================================================================
# SUBSYSTEM METRICS
# ==============================================================================

@dataclass
class RendererMetrics:
    browser_startup_ms: float = 0.0
    payload_hydration_ms: float = 0.0
    first_frame_latency_ms: float = 0.0
    average_frame_latency_ms: float = 0.0
    slowest_frame_latency_ms: float = 0.0

@dataclass
class EncoderMetrics:
    encoding_duration_ms: float = 0.0
    average_write_latency_ms: float = 0.0

@dataclass
class PlannerMetrics:
    planning_duration_ms: float = 0.0
    asset_resolution_ms: float = 0.0

@dataclass
class AudioMetrics:
    audio_decode_ms: float = 0.0
    audio_mixing_ms: float = 0.0
    graph_complexity: int = 0

@dataclass
class MuxMetrics:
    muxing_duration_ms: float = 0.0
    sync_drift_frames: float = 0.0

@dataclass
class ExportMetrics:
    start_time: float = field(default_factory=time.time)
    total_export_duration_ms: float = 0.0
    cleanup_duration_ms: float = 0.0
    peak_memory_bytes: int = 0
    average_memory_bytes: int = 0
    renderer: RendererMetrics = field(default_factory=RendererMetrics)
    encoder: EncoderMetrics = field(default_factory=EncoderMetrics)
    planner: PlannerMetrics = field(default_factory=PlannerMetrics)
    audio: AudioMetrics = field(default_factory=AudioMetrics)
    mux: MuxMetrics = field(default_factory=MuxMetrics)


# ==============================================================================
# PIPELINE EVENTS
# ==============================================================================

@dataclass(frozen=True)
class PipelineEvent:
    event_type: str
    session_id: str
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = field(default_factory=time.time)
    payload: Dict[str, Any] = field(default_factory=dict)


class ExportStarted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("ExportStarted", session_id, payload=payload or {})

class BrowserStarted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("BrowserStarted", session_id, payload=payload or {})

class BrowserReady(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("BrowserReady", session_id, payload=payload or {})

class PayloadValidated(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("PayloadValidated", session_id, payload=payload or {})

class PayloadHydrated(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("PayloadHydrated", session_id, payload=payload or {})

class RenderingStarted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("RenderingStarted", session_id, payload=payload or {})

class FrameCaptured(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("FrameCaptured", session_id, payload=payload or {})

class FrameQueued(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("FrameQueued", session_id, payload=payload or {})

class FrameEncoded(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("FrameEncoded", session_id, payload=payload or {})

class EncodingCompleted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("EncodingCompleted", session_id, payload=payload or {})

class AudioPlanningStarted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("AudioPlanningStarted", session_id, payload=payload or {})

class AudioPlanningCompleted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("AudioPlanningCompleted", session_id, payload=payload or {})

class AudioMixingStarted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("AudioMixingStarted", session_id, payload=payload or {})

class AudioMixingCompleted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("AudioMixingCompleted", session_id, payload=payload or {})

class MuxingStarted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("MuxingStarted", session_id, payload=payload or {})

class MuxingCompleted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("MuxingCompleted", session_id, payload=payload or {})

class ExportCompleted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("ExportCompleted", session_id, payload=payload or {})

class ExportFailed(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("ExportFailed", session_id, payload=payload or {})

class CleanupStarted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("CleanupStarted", session_id, payload=payload or {})

class CleanupCompleted(PipelineEvent):
    def __init__(self, session_id: str, payload: Dict[str, Any] = None):
        super().__init__("CleanupCompleted", session_id, payload=payload or {})


# ==============================================================================
# STRUCTURED SUBSYSTEM ERRORS
# ==============================================================================

class SubsystemError(Exception):
    def __init__(
        self,
        code: str,
        subsystem: str,
        message: str,
        recoverable: bool,
        session_id: str,
        root_cause: Optional[str] = None
    ):
        super().__init__(message)
        self.code = code
        self.subsystem = subsystem
        self.message = message
        self.recoverable = recoverable
        self.session_id = session_id
        self.root_cause = root_cause
        self.timestamp = time.time()


class ExportError(SubsystemError):
    def __init__(self, code: str, message: str, session_id: str, root_cause: Optional[str] = None):
        super().__init__(code, "export_session", message, False, session_id, root_cause)

class RendererError(SubsystemError):
    def __init__(self, code: str, message: str, session_id: str, root_cause: Optional[str] = None):
        super().__init__(code, "renderer", message, False, session_id, root_cause)

class EncoderError(SubsystemError):
    def __init__(self, code: str, message: str, session_id: str, root_cause: Optional[str] = None):
        super().__init__(code, "encoder", message, False, session_id, root_cause)

class BrowserError(SubsystemError):
    def __init__(self, code: str, message: str, session_id: str, root_cause: Optional[str] = None):
        super().__init__(code, "browser", message, False, session_id, root_cause)

class ValidationError(SubsystemError):
    def __init__(self, code: str, message: str, session_id: str, root_cause: Optional[str] = None):
        super().__init__(code, "validation", message, False, session_id, root_cause)

class TimeoutError(SubsystemError):
    def __init__(self, code: str, message: str, session_id: str, root_cause: Optional[str] = None):
        super().__init__(code, "timeout", message, False, session_id, root_cause)

class QueueError(SubsystemError):
    def __init__(self, code: str, message: str, session_id: str, root_cause: Optional[str] = None):
        super().__init__(code, "queue", message, False, session_id, root_cause)


# ==============================================================================
# PIPELINE CONFIG & CONTEXT
# ==============================================================================

class CancellationToken:
    def __init__(self):
        self.is_cancelled = False

    def cancel(self):
        self.is_cancelled = True


class EventBus:
    def __init__(self):
        self._subscribers = []

    def subscribe(self, callback):
        self._subscribers.append(callback)

    def publish(self, event: PipelineEvent):
        for sub in self._subscribers:
            try:
                sub(event)
            except Exception:
                pass


@dataclass(frozen=True)
class AssetManifest:
    resolved_assets: Dict[str, Path] = field(default_factory=dict)

    def get_path(self, asset_id: str) -> Path:
        if asset_id not in self.resolved_assets:
            raise KeyError(f"Asset ID {asset_id} not resolved in manifest.")
        return self.resolved_assets[asset_id]


# We stub these execution plans so the pipeline context typing matches the contract
@dataclass(frozen=True)
class VideoExecutionPlan:
    pass

@dataclass(frozen=True)
class SubtitleExecutionPlan:
    pass

@dataclass(frozen=True)
class OverlayExecutionPlan:
    pass

@dataclass(frozen=True)
class TransitionExecutionPlan:
    pass

@dataclass(frozen=True)
class EffectExecutionPlan:
    pass

@dataclass(frozen=True)
class FilterNode:
    node_id: str
    filter_name: str
    params: Dict[str, Any] = field(default_factory=dict)

@dataclass(frozen=True)
class FilterEdge:
    source_node_id: str
    target_node_id: str
    source_pad: int = 0
    target_pad: int = 0

@dataclass(frozen=True)
class FilterGraph:
    nodes: List[FilterNode] = field(default_factory=list)
    edges: List[FilterEdge] = field(default_factory=list)
    inputs: List[str] = field(default_factory=list)
    outputs: List[str] = field(default_factory=list)

@dataclass(frozen=True)
class AudioExecutionPlan:
    filter_graph: FilterGraph
    expected_duration: float
    expected_sample_rate: int
    expected_channels: int
    expected_codec: str

@dataclass(frozen=True)
class ExecutionPlan:
    duration: float
    width: int
    height: int
    fps: int
    asset_manifest: AssetManifest
    audio_plan: AudioExecutionPlan
    video_plan: VideoExecutionPlan = field(default_factory=VideoExecutionPlan)
    subtitle_plan: SubtitleExecutionPlan = field(default_factory=SubtitleExecutionPlan)
    overlay_plan: OverlayExecutionPlan = field(default_factory=OverlayExecutionPlan)
    transition_plan: TransitionExecutionPlan = field(default_factory=TransitionExecutionPlan)
    effect_plan: EffectExecutionPlan = field(default_factory=EffectExecutionPlan)


@dataclass(frozen=True)
class PipelineContext:
    plan: ExecutionPlan
    clock: TimelineClock
    asset_manifest: AssetManifest
    event_bus: EventBus
    config: EngineConfig
    session_id: str
    output_dir: Path
    scratch_dir: Path
    cancellation_token: CancellationToken
    metrics: ExportMetrics


# ==============================================================================
# PIPELINE STATE MACHINE
# ==============================================================================

class ExportState(Enum):
    IDLE = "idle"
    INITIALIZING = "initializing"
    BROWSER_STARTING = "browser_starting"
    HYDRATING = "hydrating"
    RENDERING = "rendering"
    ENCODING = "encoding"
    MIXING = "mixing"
    MUXING = "muxing"
    FINALIZING = "finalizing"
    COMPLETED = "completed"
    FAILED = "failed"
    CLEANUP = "cleanup"


class PipelineStateMachine:
    def __init__(self, initial_state: ExportState = ExportState.IDLE):
        self.state = initial_state
        self._history = [initial_state]

    def transition(self, to_state: ExportState) -> None:
        self.state = to_state
        self._history.append(to_state)

    def pause(self):
        pass

    def resume(self):
        pass

    def rollback(self):
        if len(self._history) > 1:
            self._history.pop()
            self.state = self._history[-1]


# ==============================================================================
# STAGE & PIPELINE INTERFACES
# ==============================================================================

class PipelineStage(ABC):
    @abstractmethod
    async def execute(self, context: PipelineContext) -> None:
        pass


class Renderer(ABC):
    @abstractmethod
    async def initialize(self, config: EngineConfig, event_bus: EventBus, session_id: str) -> None:
        pass

    @abstractmethod
    async def render_frame(self, frame_index: int, presentation_timestamp: float) -> Frame:
        pass

    @abstractmethod
    async def close(self) -> None:
        pass


class Encoder(ABC):
    @abstractmethod
    async def start(self, width: int, height: int, fps: float, output_path: Path) -> None:
        pass

    @abstractmethod
    async def write_frame(self, frame: Frame) -> None:
        pass

    @abstractmethod
    async def flush(self) -> None:
        pass

    @abstractmethod
    async def finalize(self) -> None:
        pass

    @abstractmethod
    async def terminate(self) -> None:
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        pass


class AssetResolver(ABC):
    @abstractmethod
    async def resolve(self, source: str) -> Path:
        pass


class CompositionPlanner(ABC):
    @abstractmethod
    async def plan(self, payload: RenderPayload, resolver: AssetResolver, session_id: str) -> ExecutionPlan:
        pass


class AudioComposer(ABC):
    @abstractmethod
    async def compose(self, plan: AudioExecutionPlan, manifest: AssetManifest, output_path: Path, session_id: str) -> Path:
        pass


class Muxer(ABC):
    @abstractmethod
    async def mux(self, video_path: Path, audio_path: Path, output_path: Path, session_id: str) -> None:
        pass
