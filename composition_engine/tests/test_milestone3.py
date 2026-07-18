import asyncio
import os
import pytest
import shutil
import psutil
from pathlib import Path
from composition_engine.models.payload import RenderPayload
from composition_engine.encoders.base import EngineConfig, PipelineEvent, SubsystemError
from composition_engine.encoders.ffmpeg import FFmpegEncoder
from composition_engine.renderers.chromium import ChromiumRenderer
from composition_engine.session import ExportSession, ExportState, OutputValidator
from composition_engine.tests.test_milestone1 import BASE_PAYLOAD

# Prepare clean outputs directory
OUTPUT_DIR = Path(__file__).resolve().parents[2] / "trust" / "artifacts" / "milestone3"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def test_stage_a_10_frame_proof():
    """
    Stage A: Render exactly 10 frames, generate silent MP4,
    verify properties with FFprobe, and check resource cleanup.
    """
    print("\n[Stage A] Starting 10-frame proof...")
    payload = RenderPayload(**BASE_PAYLOAD)
    config = EngineConfig(max_queue_size=4, debug_mode=True)
    
    # Decoupled Dependency Injection
    renderer = ChromiumRenderer(port=3001)
    encoder = FFmpegEncoder()
    session = ExportSession(config, renderer, encoder)

    # Subscribe to EventBus telemetry
    events_log = []
    session.event_bus.subscribe(lambda e: events_log.append(e))

    output_file = OUTPUT_DIR / "stage_a_proof.mp4"
    
    # Run the session for exactly 10 frames
    result = asyncio.run(session.run(payload, output_file, max_frames=10))

    # Assertions
    assert result["result"] == "success"
    assert session.state == ExportState.CLEANUP
    assert output_file.is_file()
    assert output_file.stat().st_size > 0

    # Events timeline validation
    types = [e.event_type for e in events_log]
    print(f"Timeline Events: {types}")
    assert "ExportStarted" in types
    assert "BrowserReady" in types
    assert "RenderingStarted" in types
    assert "FrameCaptured" in types
    assert "EncodingCompleted" in types
    assert "ExportCompleted" in types
    assert "CleanupCompleted" in types

    # FFprobe verify
    meta = OutputValidator.validate(
        output_file,
        expected_frames=10,
        expected_duration=10 / 30.0,
        width=1080,
        height=1920,
        fps=30.0,
        session_id=session.session_id
    )
    print(f"FFprobe metadata: {meta}")

    # Resource Leak checks
    assert session.browser is None
    assert session.page is None
    assert encoder._process is None

    # Verify no orphaned ffmpeg child processes
    current_proc = psutil.Process()
    ffmpeg_children = [c for c in current_proc.children(recursive=True) if "ffmpeg" in c.name().lower()]
    assert len(ffmpeg_children) == 0, f"Leaked ffmpeg processes found: {ffmpeg_children}"

    print("[Stage A] Passed.")


def test_stage_b_full_project():
    """
    Stage B: Render the entire project (10 seconds, 300 frames),
    validate all stream properties and hashes.
    """
    print("\n[Stage B] Starting full-project render (300 frames)...")
    payload = RenderPayload(**BASE_PAYLOAD)
    config = EngineConfig(max_queue_size=16, debug_mode=True)
    
    renderer = ChromiumRenderer(port=3001)
    encoder = FFmpegEncoder()
    session = ExportSession(config, renderer, encoder)

    events_log = []
    session.event_bus.subscribe(lambda e: events_log.append(e))

    output_file = OUTPUT_DIR / "stage_b_full.mp4"
    
    result = asyncio.run(session.run(payload, output_file))

    # Assertions
    assert result["result"] == "success"
    assert session.state == ExportState.CLEANUP
    
    # Verify expected count
    expected_frames = int(payload.backgroundVideo.duration * payload.fps) # 10 * 30 = 300
    
    meta = OutputValidator.validate(
        output_file,
        expected_frames=expected_frames,
        expected_duration=payload.backgroundVideo.duration,
        width=1080,
        height=1920,
        fps=30.0,
        session_id=session.session_id
    )
    print(f"FFprobe metadata (Full): {meta}")

    # Verify leaks
    current_proc = psutil.Process()
    ffmpeg_children = [c for c in current_proc.children(recursive=True) if "ffmpeg" in c.name().lower()]
    assert len(ffmpeg_children) == 0

    print("[Stage B] Passed.")


def test_stage_c_failure_simulations():
    """
    Stage C: Run failure simulations to verify graceful recovery
    and resource cleanup.
    """
    print("\n[Stage C] Running failure simulations...")
    payload = RenderPayload(**BASE_PAYLOAD)
    output_file = OUTPUT_DIR / "failed_run.mp4"

    # Case 1: Encoder crash (kill subprocess mid-stream)
    print("--- Simulating Encoder Crash ---")
    config = EngineConfig(max_queue_size=4, debug_mode=True)
    renderer = ChromiumRenderer(port=3001)
    encoder = FFmpegEncoder()
    session = ExportSession(config, renderer, encoder)

    # Let's intercept frame encoding to kill the encoder subprocess
    original_write = encoder.write_frame
    async def crash_write(frame):
        if frame.frame_index == 3:
            print("Force-killing FFmpeg process to simulate crash...")
            if encoder._process:
                encoder._process.kill()
                await encoder._process.wait()
        await original_write(frame)
    encoder.write_frame = crash_write

    with pytest.raises(Exception):
        asyncio.run(session.run(payload, output_file))

    # Assert that session cleaned up and browser is closed
    assert session.state == ExportState.CLEANUP
    assert session.browser is None
    assert encoder._process is None
    
    # Confirm no leaked processes
    current_proc = psutil.Process()
    ffmpeg_children = [c for c in current_proc.children(recursive=True) if "ffmpeg" in c.name().lower()]
    assert len(ffmpeg_children) == 0

    # Case 2: Cancellation Request
    print("--- Simulating Cancellation Request ---")
    renderer2 = ChromiumRenderer(port=3001)
    encoder2 = FFmpegEncoder()
    session2 = ExportSession(config, renderer2, encoder2)

    # Intercept frame capture to cancel session mid-loop
    original_render = renderer2.render_frame
    async def cancel_render(idx, t):
        if idx == 5:
            print("Force-canceling session...")
            session2.cancel()
        return await original_render(idx, t)
    renderer2.render_frame = cancel_render

    with pytest.raises(SubsystemError):
        asyncio.run(session2.run(payload, output_file))

    assert session2.state == ExportState.CLEANUP
    assert session2.browser is None
    assert encoder2._process is None

    print("[Stage C] Passed.")
