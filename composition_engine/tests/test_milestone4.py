import asyncio
import os
import pytest
import shutil
import psutil
from pathlib import Path
from composition_engine.models.payload import RenderPayload
from composition_engine.encoders.base import EngineConfig, PipelineEvent, SubsystemError
from composition_engine.encoders.ffmpeg import FFmpegEncoder
from composition_engine.encoders.audio_composer import FFmpegAudioComposer, FFmpegMuxer
from composition_engine.renderers.chromium import ChromiumRenderer
from composition_engine.session import ExportSession, ExportState, OutputValidator
from composition_engine.tests.test_milestone1 import BASE_PAYLOAD

# Prepare clean outputs directory
OUTPUT_DIR = Path(__file__).resolve().parents[2] / "trust" / "artifacts" / "milestone4"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def test_stage_a_single_track():
    """
    Stage A: Mux silent video with a single audio track (the background video audio),
    and verify output properties using FFprobe.
    """
    print("\n[Stage A] Starting single track sync test...")
    payload = RenderPayload(**BASE_PAYLOAD)
    config = EngineConfig(max_queue_size=4, debug_mode=True)
    
    renderer = ChromiumRenderer(port=3001)
    encoder = FFmpegEncoder()
    composer = FFmpegAudioComposer()
    muxer = FFmpegMuxer()
    session = ExportSession(config, renderer, encoder, composer, muxer)

    # Subscribe to EventBus
    events_log = []
    session.event_bus.subscribe(lambda e: events_log.append(e))

    output_file = OUTPUT_DIR / "stage_a_sync.mp4"
    
    # Run E2E for exactly 10 frames
    result = asyncio.run(session.run(payload, output_file, max_frames=10))

    # Assertions
    assert result["result"] == "success"
    assert session.state_machine.state == ExportState.CLEANUP
    assert output_file.is_file()
    assert output_file.stat().st_size > 0

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
    print(f"FFprobe metadata (Stage A): {meta}")

    # Check process cleanup
    assert session.browser is None
    assert session.page is None
    assert encoder._process is None
    assert composer._process is None

    current_proc = psutil.Process()
    ffmpeg_children = [c for c in current_proc.children(recursive=True) if "ffmpeg" in c.name().lower()]
    assert len(ffmpeg_children) == 0

    print("[Stage A] Passed.")


def test_stage_b_multi_track():
    """
    Stage B: Mix multiple tracks (background video audio + mock music track),
    validate timeline overlays, fades, loops, and telemetry metrics.
    """
    print("\n[Stage B] Starting multi-track mix test...")
    payload_dict = BASE_PAYLOAD.copy()
    
    # Add a mock secondary audio track to the RenderPayload schema
    # We will simulate a background music track
    mock_music_path = Path(__file__).resolve().parents[2] / "trust" / "tests" / "export_after_fix.mp4"
    
    payload_dict["audioTracks"] = [
        {
            "id": "music_track_1",
            "type": "bg_music",
            "enabled": True,
            "muted": False,
            "solo": False,
            "volume": 0.5,
            "clips": [
                {
                    "id": "clip_music_1",
                    "source": str(mock_music_path),
                    "trimStart": 2.0,
                    "trimEnd": 5.0,
                    "timelineStart": 0.0,
                    "timelineEnd": 3.0,
                    "fadeIn": 0.5,
                    "fadeOut": 0.5,
                    "loop": True
                }
            ]
        }
    ]

    payload = RenderPayload(**payload_dict)
    config = EngineConfig(max_queue_size=8, debug_mode=True)
    
    renderer = ChromiumRenderer(port=3001)
    encoder = FFmpegEncoder()
    composer = FFmpegAudioComposer()
    muxer = FFmpegMuxer()
    session = ExportSession(config, renderer, encoder, composer, muxer)

    output_file = OUTPUT_DIR / "stage_b_multi.mp4"
    
    # Run full E2E session
    result = asyncio.run(session.run(payload, output_file))

    # Assertions
    assert result["result"] == "success"
    
    # Verify expected count (300 frames)
    expected_frames = int(payload.backgroundVideo.duration * payload.fps) # 300
    
    meta = OutputValidator.validate(
        output_file,
        expected_frames=expected_frames,
        expected_duration=payload.backgroundVideo.duration,
        width=1080,
        height=1920,
        fps=30.0,
        session_id=session.session_id
    )
    print(f"FFprobe metadata (Stage B): {meta}")

    # Verify metrics aggregation
    metrics = result["metrics"]
    print(f"Aggregated Metrics: {metrics}")
    assert metrics.planner.planning_duration_ms > 0
    assert metrics.renderer.browser_startup_ms > 0
    assert metrics.renderer.average_frame_latency_ms > 0
    assert metrics.audio.audio_mixing_ms > 0
    assert metrics.mux.muxing_duration_ms > 0
    assert metrics.peak_memory_bytes > 0

    print("[Stage B] Passed.")


def test_stage_c_failures():
    """
    Stage C: Test missing audio asset validation failure, FFmpeg subprocess
    crash, and pipeline cancellation.
    """
    print("\n[Stage C] Running failure simulations...")
    payload_dict = BASE_PAYLOAD.copy()
    
    # 1. Missing audio track asset validation test
    print("--- Simulating Missing Audio Asset ---")
    payload_dict["audioTracks"] = [
        {
            "id": "missing_track_1",
            "type": "bg_music",
            "clips": [
                {
                    "id": "clip_missing",
                    "source": "nonexistent_track_file_path.mp3",
                    "trimStart": 0.0,
                    "trimEnd": 5.0,
                    "timelineStart": 0.0,
                    "timelineEnd": 5.0
                }
            ]
        }
    ]

    payload = RenderPayload(**payload_dict)
    config = EngineConfig(max_queue_size=4, debug_mode=True)
    renderer = ChromiumRenderer(port=3001)
    encoder = FFmpegEncoder()
    composer = FFmpegAudioComposer()
    muxer = FFmpegMuxer()
    session = ExportSession(config, renderer, encoder, composer, muxer)

    output_file = OUTPUT_DIR / "failed_run.mp4"

    # Must raise ValidationError immediately during planning phase
    with pytest.raises(SubsystemError) as exc_info:
        asyncio.run(session.run(payload, output_file))
    
    assert exc_info.value.code == "MISSING_AUDIO_ASSET"
    assert session.state_machine.state == ExportState.CLEANUP
    assert session.browser is None

    # 2. Cancellation midway test
    print("--- Simulating Cancellation Request ---")
    payload_valid = RenderPayload(**BASE_PAYLOAD)
    renderer2 = ChromiumRenderer(port=3001)
    encoder2 = FFmpegEncoder()
    composer2 = FFmpegAudioComposer()
    muxer2 = FFmpegMuxer()
    session2 = ExportSession(config, renderer2, encoder2, composer2, muxer2)

    # Force cancel mid-rendering loop
    original_render = renderer2.render_frame
    async def cancel_render(idx, t):
        if idx == 4:
            print("Force-canceling composition...")
            session2.cancel()
        return await original_render(idx, t)
    renderer2.render_frame = cancel_render

    with pytest.raises(SubsystemError) as exc_info2:
        asyncio.run(session2.run(payload_valid, output_file))

    assert exc_info2.value.code == "CANCELED"
    assert session2.state_machine.state == ExportState.CLEANUP
    assert session2.browser is None
    assert encoder2._process is None

    print("[Stage C] Passed.")
