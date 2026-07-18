import asyncio
import hashlib
import json
import os
import shutil
import tempfile
import time
import uuid
import psutil
from pathlib import Path
from typing import Any, Dict, List, Optional
from playwright.async_api import async_playwright

from composition_engine.encoders.base import (
    Frame,
    EngineConfig,
    TimelineClock,
    RendererMetrics,
    EncoderMetrics,
    PlannerMetrics,
    AudioMetrics,
    MuxMetrics,
    ExportMetrics,
    PipelineEvent,
    ExportStarted,
    BrowserStarted,
    BrowserReady,
    PayloadValidated,
    PayloadHydrated,
    RenderingStarted,
    FrameCaptured,
    FrameQueued,
    FrameEncoded,
    EncodingCompleted,
    AudioPlanningStarted,
    AudioPlanningCompleted,
    AudioMixingStarted,
    AudioMixingCompleted,
    MuxingStarted,
    MuxingCompleted,
    ExportCompleted,
    ExportFailed,
    CleanupStarted,
    CleanupCompleted,
    SubsystemError,
    ExportError,
    RendererError,
    EncoderError,
    BrowserError,
    ValidationError,
    TimeoutError,
    QueueError,
    CancellationToken,
    EventBus,
    AssetManifest,
    ExecutionPlan,
    PipelineContext,
    ExportState,
    PipelineStateMachine,
    PipelineStage,
    Renderer,
    Encoder,
    AssetResolver,
    CompositionPlanner,
    AudioComposer,
    Muxer
)
from composition_engine.models.payload import RenderPayload
from composition_engine.encoders.audio_planner import AudioPlanner, LocalAssetResolver
from composition_engine.encoders.audio_composer import FFmpegAudioComposer, FFmpegMuxer

# ==============================================================================
# VALIDATORS
# ==============================================================================

class PayloadValidator:
    @staticmethod
    def validate(payload: RenderPayload, session_id: str) -> None:
        if not payload.projectId:
            raise ValidationError("INVALID_PAYLOAD", "Missing projectId in payload.", session_id)
        if payload.fps <= 0 or payload.fps > 120:
            raise ValidationError("INVALID_FPS", f"Invalid FPS: {payload.fps}", session_id)
        if not payload.dimensions or payload.dimensions.width <= 0 or payload.dimensions.height <= 0:
            raise ValidationError("INVALID_DIMENSIONS", "Invalid or missing dimensions.", session_id)


class FrameValidator:
    @staticmethod
    def validate(frame: Frame, session_id: str) -> None:
        if not frame.frame_id:
            raise ValidationError("INVALID_FRAME_ID", "Frame ID cannot be empty.", session_id)
        if frame.image_width <= 0 or frame.image_height <= 0:
            raise ValidationError("INVALID_FRAME_DIMENSIONS", f"Invalid frame dimensions: {frame.image_width}x{frame.image_height}", session_id)
        if frame.byte_size <= 0 or not frame.image_payload:
            raise ValidationError("EMPTY_FRAME_PAYLOAD", f"Frame index {frame.frame_index} payload is empty.", session_id)
        if not frame.sha256_hash:
            raise ValidationError("MISSING_FRAME_HASH", f"Frame index {frame.frame_index} hash is empty.", session_id)
        
        computed = hashlib.sha256(frame.image_payload).hexdigest()
        if computed != frame.sha256_hash:
            raise ValidationError("CORRUPTED_FRAME_PAYLOAD", f"Frame index {frame.frame_index} payload hash mismatch.", session_id)


class StreamValidator:
    def __init__(self, fps: float, session_id: str):
        self.fps = fps
        self.session_id = session_id
        self.next_index = 0
        self.last_timestamp = -1.0
        self.hashes = set()

    def validate_next(self, frame: Frame) -> None:
        if frame.frame_index != self.next_index:
            raise ValidationError("OUT_OF_ORDER_FRAME", f"Expected frame index {self.next_index}, got {frame.frame_index}", self.session_id)
        
        if frame.presentation_timestamp <= self.last_timestamp and self.next_index > 0:
            raise ValidationError("NON_MONOTONIC_TIMESTAMP", f"Frame index {frame.frame_index} timestamp {frame.presentation_timestamp} is not monotonic.", self.session_id)
        
        expected_t = frame.frame_index / self.fps
        if abs(frame.presentation_timestamp - expected_t) > 1e-5:
            raise ValidationError("TIMESTAMP_ALIGNMENT_ERROR", f"Frame index {frame.frame_index} timestamp {frame.presentation_timestamp} deviates from expected {expected_t}.", self.session_id)

        self.hashes.add(frame.sha256_hash)
        self.next_index += 1
        self.last_timestamp = frame.presentation_timestamp


class OutputValidator:
    @staticmethod
    def validate(mp4_path: Path, expected_frames: int, expected_duration: float, width: int, height: int, fps: float, session_id: str) -> Dict[str, Any]:
        if not mp4_path.is_file():
            raise ValidationError("MISSING_OUTPUT_FILE", f"Output MP4 file does not exist: {mp4_path}", session_id)
        if mp4_path.stat().st_size == 0:
            raise ValidationError("EMPTY_OUTPUT_FILE", f"Output MP4 file is empty: {mp4_path}", session_id)

        import subprocess
        cmd = [
            "ffprobe",
            "-v", "error",
            "-select_streams", "v:0",
            "-count_packets",
            "-show_entries", "stream=codec_name,r_frame_rate,width,height,nb_read_packets,duration",
            "-show_entries", "format=duration",
            "-print_format", "json",
            str(mp4_path)
        ]

        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            data = json.loads(res.stdout.decode("utf-8"))
            streams = data.get("streams", [{}])
            stream = streams[0] if streams else {}
        except Exception as e:
            raise ValidationError("FFPROBE_FAILED", f"ffprobe execution failed: {str(e)}", session_id, root_cause=str(e))

        codec = stream.get("codec_name")
        actual_width = stream.get("width")
        actual_height = stream.get("height")
        packets = int(stream.get("nb_read_packets", 0))
        duration = float(data.get("format", {}).get("duration", 0.0))

        if codec != "h264":
            raise ValidationError("INVALID_CODEC", f"Expected codec h264, got {codec}", session_id)
        if actual_width != width or actual_height != height:
            raise ValidationError("INVALID_RESOLUTION", f"Expected resolution {width}x{height}, got {actual_width}x{actual_height}", session_id)
        if packets != expected_frames:
            raise ValidationError("FRAME_COUNT_MISMATCH", f"Expected {expected_frames} encoded packets, got {packets}", session_id)
        if abs(duration - expected_duration) > 0.5:
            raise ValidationError("DURATION_MISMATCH", f"Expected duration {expected_duration}s, got {duration}s", session_id)

        return {
            "codec": codec,
            "width": actual_width,
            "height": actual_height,
            "frame_count": packets,
            "duration": duration
        }


# ==============================================================================
# PIPELINE STAGE IMPLEMENTATIONS
# ==============================================================================

class PlanningStage(PipelineStage):
    def __init__(self, planner: CompositionPlanner, payload: RenderPayload):
        self.planner = planner
        self.payload = payload

    async def execute(self, context: PipelineContext) -> None:
        context.event_bus.publish(AudioPlanningStarted(context.session_id))
        start_t = time.perf_counter()
        
        # Initialize resolver
        resolver = LocalAssetResolver(context.scratch_dir)
        
        # Build execution plan
        exec_plan = await self.planner.plan(self.payload, resolver, context.session_id)
        
        # Store in context (Workaround: PipelineContext is frozen, but we can write to its dictionary or inner models)
        object.__setattr__(context, "plan", exec_plan)
        object.__setattr__(context, "asset_manifest", exec_plan.asset_manifest)
        
        context.metrics.planner.planning_duration_ms = (time.perf_counter() - start_t) * 1000.0
        context.event_bus.publish(AudioPlanningCompleted(context.session_id))


class RenderingStage(PipelineStage):
    def __init__(self, renderer: Renderer, encoder: Encoder, max_frames: Optional[int] = None):
        self.renderer = renderer
        self.encoder = encoder
        self.max_frames = max_frames
        self._queue_depths = []
        self._producer_waits = []
        self._consumer_waits = []
        self._frame_latencies = []
        self._first_frame_latency = None

    async def execute(self, context: PipelineContext) -> None:
        transition = getattr(context, "transition", None)
        if transition:
            transition(ExportState.RENDERING)
        context.event_bus.publish(RenderingStarted(context.session_id))
        
        # Spawns silent video output file in scratch dir
        video_out_path = context.scratch_dir / f"silent_{context.session_id}.mp4"
        await self.encoder.start(context.plan.width, context.plan.height, context.plan.fps, video_out_path)

        queue = asyncio.Queue(maxsize=context.config.max_queue_size)
        fps = context.plan.fps
        duration = context.plan.duration
        total_frames = int(duration * fps)
        if self.max_frames is not None:
            total_frames = min(total_frames, self.max_frames)

        stream_validator = StreamValidator(fps, context.session_id)

        # Producer Task
        async def producer():
            for idx in range(total_frames):
                if context.cancellation_token.is_cancelled:
                    break

                t = context.clock.get_timestamp(idx)

                f_start = time.perf_counter()
                frame = await self.renderer.render_frame(idx, t)
                f_end = time.perf_counter()
                f_lat = (f_end - f_start) * 1000.0

                if self._first_frame_latency is None:
                    self._first_frame_latency = f_lat
                self._frame_latencies.append(f_lat)

                FrameValidator.validate(frame, context.session_id)
                stream_validator.validate_next(frame)
                context.event_bus.publish(FrameCaptured(context.session_id, {"index": idx}))

                self._queue_depths.append(queue.qsize())
                
                q_start = time.perf_counter()
                try:
                    await asyncio.wait_for(queue.put(frame), timeout=context.config.timeout_seconds)
                except asyncio.TimeoutError:
                    raise QueueError("QUEUE_TIMEOUT", "Queue block timed out. Consumer is too slow.", context.session_id)
                
                self._producer_waits.append((time.perf_counter() - q_start) * 1000.0)
                context.event_bus.publish(FrameQueued(context.session_id, {"index": idx}))

            await queue.put(None)

        # Consumer Task
        async def consumer():
            frames_cnt = 0
            while True:
                c_start = time.perf_counter()
                frame = await queue.get()
                self._consumer_waits.append((time.perf_counter() - c_start) * 1000.0)

                if frame is None:
                    queue.task_done()
                    break

                if context.cancellation_token.is_cancelled:
                    queue.task_done()
                    break

                await self.encoder.write_frame(frame)
                context.event_bus.publish(FrameEncoded(context.session_id, {"index": frame.frame_index}))
                queue.task_done()
                frames_cnt += 1

            context.event_bus.publish(EncodingCompleted(context.session_id, {"count": frames_cnt}))

        # Concurrently execute render loop
        enc_start = time.perf_counter()
        await asyncio.gather(producer(), consumer())
        context.metrics.encoder.encoding_duration_ms = (time.perf_counter() - enc_start) * 1000.0

        if context.cancellation_token.is_cancelled:
            raise ExportError("CANCELED", "Export session was canceled.", context.session_id)

        # Flush & finalize video encoder
        await self.encoder.flush()
        await self.encoder.finalize()

        # Telemetry metrics collection
        avg_lat = sum(self._frame_latencies) / len(self._frame_latencies) if self._frame_latencies else 0.0
        slowest = max(self._frame_latencies) if self._frame_latencies else 0.0
        avg_q = sum(self._queue_depths) / len(self._queue_depths) if self._queue_depths else 0.0
        max_q = max(self._queue_depths) if self._queue_depths else 0
        avg_prod_w = sum(self._producer_waits) / len(self._producer_waits) if self._producer_waits else 0.0
        avg_cons_w = sum(self._consumer_waits) / len(self._consumer_waits) if self._consumer_waits else 0.0

        context.metrics.renderer.first_frame_latency_ms = self._first_frame_latency or 0.0
        context.metrics.renderer.average_frame_latency_ms = avg_lat
        context.metrics.renderer.slowest_frame_latency_ms = slowest
        
        # Direct write of metrics variables to contextual dictionary
        context.metrics.__dict__.update({
            "average_queue_depth": avg_q,
            "maximum_queue_depth": max_q,
            "average_producer_wait_ms": avg_prod_w,
            "average_consumer_wait_ms": avg_cons_w
        })


class AudioStage(PipelineStage):
    def __init__(self, composer: AudioComposer):
        self.composer = composer

    async def execute(self, context: PipelineContext) -> None:
        transition = getattr(context, "transition", None)
        if transition:
            transition(ExportState.MIXING)
        context.event_bus.publish(AudioMixingStarted(context.session_id))
        start_t = time.perf_counter()

        mixed_audio_path = context.scratch_dir / f"mixed_{context.session_id}.wav"
        
        # Perform audio mix
        await self.composer.compose(
            context.plan.audio_plan,
            context.asset_manifest,
            mixed_audio_path,
            context.session_id
        )

        context.metrics.audio.audio_mixing_ms = (time.perf_counter() - start_t) * 1000.0
        context.event_bus.publish(AudioMixingCompleted(context.session_id))


class MuxStage(PipelineStage):
    def __init__(self, muxer: Muxer, final_output: Path, expected_frames: int):
        self.muxer = muxer
        self.final_output = final_output
        self.expected_frames = expected_frames

    async def execute(self, context: PipelineContext) -> None:
        transition = getattr(context, "transition", None)
        if transition:
            transition(ExportState.MUXING)
        context.event_bus.publish(MuxingStarted(context.session_id))
        start_t = time.perf_counter()

        silent_video = context.scratch_dir / f"silent_{context.session_id}.mp4"
        mixed_audio = context.scratch_dir / f"mixed_{context.session_id}.wav"

        # Mux files
        await self.muxer.mux(silent_video, mixed_audio, self.final_output, context.session_id)

        context.metrics.mux.muxing_duration_ms = (time.perf_counter() - start_t) * 1000.0
        context.event_bus.publish(MuxingCompleted(context.session_id))

        # Output verification
        OutputValidator.validate(
            self.final_output,
            self.expected_frames,
            self.expected_frames / context.plan.fps,
            context.plan.width,
            context.plan.height,
            context.plan.fps,
            context.session_id
        )


# ==============================================================================
# PIPELINE COORDINATOR
# ==============================================================================

class CompositionPipeline:
    def __init__(self, clock: TimelineClock, stages: List[PipelineStage]):
        self.clock = clock
        self.stages = stages

    async def execute(self, context: PipelineContext) -> None:
        for stage in self.stages:
            if context.cancellation_token.is_cancelled:
                raise ExportError("CANCELED", "Composition pipeline was canceled mid-stage.", context.session_id)
            await stage.execute(context)


# ==============================================================================
# EXPORT LIFECYCLE COORDINATOR
# ==============================================================================

class ExportSession:
    def __init__(self, config: EngineConfig, renderer: Renderer, encoder: Encoder, composer: AudioComposer, muxer: Muxer):
        self.config = config
        self.renderer = renderer
        self.encoder = encoder
        self.composer = composer
        self.muxer = muxer
        
        self.session_id = str(uuid.uuid4())
        self.state_machine = PipelineStateMachine()
        self.event_bus = EventBus()
        self.cancellation_token = CancellationToken()
        self.metrics = ExportMetrics()
        self._logs = []
        
        self.browser = None
        self.context = None
        self.page = None
        self._playwright_mgr = None
        
        self.output_dir = Path(__file__).resolve().parents[1] / "trust" / "artifacts" / "milestone4"
        self.scratch_dir = Path(tempfile.gettempdir()) / f"vidyut_export_{self.session_id}"
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.scratch_dir, exist_ok=True)

    def _log(self, msg: str) -> None:
        line = f"[{time.strftime('%H:%M:%S')}] [Session:{self.session_id[:8]}] {msg}"
        self._logs.append(line)
        print(line, flush=True)

    def _transition(self, to_state: ExportState) -> None:
        self._log(f"State Transition: {self.state_machine.state.value} -> {to_state.value}")
        self.state_machine.transition(to_state)

    async def run(self, payload: RenderPayload, output_file: Path, max_frames: Optional[int] = None) -> Dict[str, Any]:
        self._transition(ExportState.INITIALIZING)
        self.event_bus.publish(ExportStarted(self.session_id, {"projectId": payload.projectId}))
        
        self.metrics.start_time = time.time()

        try:
            # 1. Spawns CompositionPlanner to build ExecutionPlan
            planner = AudioPlanner()
            resolver = LocalAssetResolver(self.scratch_dir)
            
            # Setup clock
            clock = TimelineClock(payload.fps, payload.backgroundVideo.duration)

            # Define pipeline context stub (empty plan/manifest initialized in PlanningStage)
            context = PipelineContext(
                plan=None,
                clock=clock,
                asset_manifest=None,
                event_bus=self.event_bus,
                config=self.config,
                session_id=self.session_id,
                output_dir=self.output_dir,
                scratch_dir=self.scratch_dir,
                cancellation_token=self.cancellation_token,
                metrics=self.metrics
            )

            # Planning stage execution
            plan_stage = PlanningStage(planner, payload)
            await plan_stage.execute(context)

            # 2. Browser Startup
            self._transition(ExportState.BROWSER_STARTING)
            self.event_bus.publish(BrowserStarted(self.session_id))
            
            pw_start = time.perf_counter()
            self._playwright_mgr = await async_playwright().start()
            self.browser = await self._playwright_mgr.chromium.launch(
                headless=self.config.browser_headless,
                args=self.config.browser_args
            )
            self.context = await self.browser.new_context(
                viewport={"width": payload.dimensions.width, "height": payload.dimensions.height},
                device_scale_factor=1,
                color_scheme="dark",
                reduced_motion="reduce"
            )

            # Pre-register route mocks for fonts and video
            font_path = Path(__file__).resolve().parents[1] / "trust" / "fonts" / "Inter-700.ttf"
            video_path = Path(__file__).resolve().parents[1] / "trust" / "tests" / "export_after_fix.mp4"
            if font_path.is_file() and video_path.is_file():
                font_bytes = font_path.read_bytes()
                video_bytes = video_path.read_bytes()
                
                async def google_css(route: Any) -> None:
                    await route.fulfill(
                        status=200,
                        content_type="text/css; charset=utf-8",
                        body='@font-face { font-family: "Inter"; font-style: normal; font-weight: 700; font-display: block; src: url("/milestone2-assets/Inter-700.ttf") format("truetype"); }',
                    )
                async def font_route(route: Any) -> None:
                    await route.fulfill(status=200, content_type="font/ttf", body=font_bytes)
                async def video_route(route: Any) -> None:
                    await route.fulfill(status=200, content_type="video/mp4", body=video_bytes)

                await self.context.route("https://fonts.googleapis.com/**", google_css)
                await self.context.route("**/milestone2-assets/Inter-700.ttf", font_route)
                await self.context.route("**/milestone2-assets/background.mp4", video_route)

            self.page = await self.context.new_page()
            self.metrics.renderer.browser_startup_ms = (time.perf_counter() - pw_start) * 1000.0
            self.event_bus.publish(BrowserReady(self.session_id))

            # 3. Zustand state hydration
            self._transition(ExportState.HYDRATING)
            
            payload_dict = payload.model_dump(by_alias=True)
            payload_dict["projectId"] = payload.projectId
            
            hyd_start = time.perf_counter()
            await self.page.add_init_script(f"window.__INITIAL_PAYLOAD__ = {json.dumps(payload_dict)}; window.__EXPORT_MODE__ = true;")
            
            port = int(self.renderer.base_url.split(":")[-1]) if hasattr(self.renderer, "base_url") else 3001
            await self.page.goto(f"http://localhost:{port}/test-parity?id=1&export=true", wait_until="domcontentloaded")
            
            # Wait for ready contract
            await self.page.wait_for_function("window.__IS_READY_TO_RENDER__ === true", timeout=20000)
            self.metrics.renderer.payload_hydration_ms = (time.perf_counter() - hyd_start) * 1000.0
            self.event_bus.publish(PayloadHydrated(self.session_id))

            # 4. Initialize Renderer (Dependency Injection)
            await self.renderer.initialize(self.config, self.event_bus, self.session_id, self.page)

            # 5. Define Pipeline Stages & Coordinate Execute
            render_stage = RenderingStage(self.renderer, self.encoder, max_frames)
            audio_stage = AudioStage(self.composer)
            expected_frames = int(clock.duration * clock.fps) if max_frames is None else max_frames
            mux_stage = MuxStage(self.muxer, output_file, expected_frames)

            # Store the transition function in the context
            object.__setattr__(context, "transition", self._transition)

            pipeline = CompositionPipeline(clock, [render_stage, audio_stage, mux_stage])
            await pipeline.execute(context)

            self._transition(ExportState.COMPLETED)
            self.event_bus.publish(ExportCompleted(self.session_id, {"output_path": str(output_file)}))

        except Exception as e:
            self._transition(ExportState.FAILED)
            self.event_bus.publish(ExportFailed(self.session_id, {"error": str(e)}))
            raise e
        finally:
            await self.cleanup()

        self.metrics.total_export_duration_ms = (time.time() - self.metrics.start_time) * 1000.0
        
        # Capture memory usage
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        self.metrics.peak_memory_bytes = mem_info.peak_wset if hasattr(mem_info, "peak_wset") else mem_info.rss
        self.metrics.average_memory_bytes = mem_info.rss

        return {
            "session_id": self.session_id,
            "result": "success",
            "metrics": self.metrics,
            "timeline": self._logs
        }

    async def cleanup(self) -> None:
        self._transition(ExportState.CLEANUP)
        self.event_bus.publish(CleanupStarted(self.session_id))
        
        cleanup_start = time.perf_counter()

        # 1. Close Renderer
        try:
            await self.renderer.close()
        except Exception:
            pass

        # 2. Terminate Encoder Subprocesses
        try:
            await self.encoder.terminate()
        except Exception:
            pass
        try:
            await self.composer.terminate()
        except Exception:
            pass

        # 3. Playwright Resource Disposal
        try:
            if self.page:
                await self.page.close()
        except Exception:
            pass
        try:
            if self.context:
                await self.context.close()
        except Exception:
            pass
        try:
            if self.browser:
                await self.browser.close()
        except Exception:
            pass
        try:
            if self._playwright_mgr:
                await self._playwright_mgr.stop()
        except Exception:
            pass

        # 4. Clean up Scratch Temp Files
        try:
            if os.path.isdir(self.scratch_dir):
                shutil.rmtree(self.scratch_dir)
        except Exception:
            pass

        # 5. Clean up any leaked child FFmpeg processes
        try:
            current_process = psutil.Process()
            for child in current_process.children(recursive=True):
                if "ffmpeg" in child.name().lower():
                    child.kill()
        except Exception:
            pass

        self.page = None
        self.context = None
        self.browser = None
        self._playwright_mgr = None

        self.metrics.cleanup_duration_ms = (time.perf_counter() - cleanup_start) * 1000.0
        self.event_bus.publish(CleanupCompleted(self.session_id))

    def cancel(self) -> None:
        self.cancellation_token.cancel()
        self._log("Cancellation token canceled.")
