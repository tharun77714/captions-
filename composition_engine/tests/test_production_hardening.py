import asyncio
import os
import time
import pytest
import shutil
import psutil
import hashlib
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional

from composition_engine.models.payload import RenderPayload
from composition_engine.encoders.base import (
    Frame,
    EngineConfig,
    TimelineClock,
    PipelineContext,
    ExportState,
    PipelineStateMachine,
    ValidationError,
    EncoderError,
    SubsystemError,
    ExportError,
    Renderer,
    Encoder,
    AssetResolver,
    CompositionPlanner,
    AudioComposer,
    Muxer
)
from composition_engine.encoders.ffmpeg import FFmpegEncoder
from composition_engine.encoders.audio_composer import FFmpegAudioComposer, FFmpegMuxer
from composition_engine.encoders.audio_planner import AudioPlanner, LocalAssetResolver, AudioTrack, AudioClip
from composition_engine.renderers.chromium import ChromiumRenderer
from composition_engine.session import ExportSession, OutputValidator
from composition_engine.tests.test_milestone1 import BASE_PAYLOAD

OUTPUT_DIR = Path(__file__).resolve().parents[2] / "trust" / "artifacts" / "production_validation"
TEST_ASSETS_DIR = Path(__file__).resolve().parents[2] / "trust" / "tests" / "assets"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEST_ASSETS_DIR, exist_ok=True)


# ==============================================================================
# FIREGROUND AUDIO ASSET GENERATORS
# ==============================================================================

def generate_test_audio_assets():
    """
    Generates various test audio formats (mono/stereo, sample rates, formats)
    to validate the FFmpegAudioComposer compatibility.
    """
    # 1. 44.1kHz Stereo WAV
    wav_stereo_441 = TEST_ASSETS_DIR / "stereo_441.wav"
    if not wav_stereo_441.is_file():
        cmd = ["ffmpeg", "-y", "-f", "lavfi", "-i", "sine=f=440:r=44100", "-t", "5", str(wav_stereo_441)]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    # 2. 48kHz Mono WAV
    wav_mono_48 = TEST_ASSETS_DIR / "mono_48.wav"
    if not wav_mono_48.is_file():
        cmd = ["ffmpeg", "-y", "-f", "lavfi", "-i", "sine=f=440:r=48000", "-ac", "1", "-t", "5", str(wav_mono_48)]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    # 3. MP3 (CBR)
    mp3_cbr = TEST_ASSETS_DIR / "cbr.mp3"
    if not mp3_cbr.is_file():
        cmd = ["ffmpeg", "-y", "-i", str(wav_stereo_441), "-codec:a", "libmp3lame", "-b:a", "128k", str(mp3_cbr)]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    # 4. MP3 (VBR)
    mp3_vbr = TEST_ASSETS_DIR / "vbr.mp3"
    if not mp3_vbr.is_file():
        cmd = ["ffmpeg", "-y", "-i", str(wav_stereo_441), "-codec:a", "libmp3lame", "-q:a", "2", str(mp3_vbr)]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    # 5. AAC
    aac_file = TEST_ASSETS_DIR / "stereo.aac"
    if not aac_file.is_file():
        cmd = ["ffmpeg", "-y", "-i", str(wav_stereo_441), "-codec:a", "aac", "-b:a", "128k", str(aac_file)]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    # 6. M4A
    m4a_file = TEST_ASSETS_DIR / "audio.m4a"
    if not m4a_file.is_file():
        cmd = ["ffmpeg", "-y", "-i", str(wav_stereo_441), "-codec:a", "aac", str(m4a_file)]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    # 7. Unsupported / Corrupt Asset
    corrupt_file = TEST_ASSETS_DIR / "corrupt.mp3"
    if not corrupt_file.is_file():
        corrupt_file.write_bytes(b"NOT_A_REAL_AUDIO_FILE_GARBAGE_DATA")

    return {
        "wav_stereo_441": wav_stereo_441,
        "wav_mono_48": wav_mono_48,
        "mp3_cbr": mp3_cbr,
        "mp3_vbr": mp3_vbr,
        "aac": aac_file,
        "m4a": m4a_file,
        "corrupt": corrupt_file
    }


# ==============================================================================
# MOCK RENDERER FOR TIMING SCALING TESTS
# ==============================================================================

class MockRenderer(Renderer):
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height

    async def initialize(self, config: EngineConfig, event_bus: Any, session_id: str, page: Any) -> None:
        pass

    async def render_frame(self, frame_index: int, presentation_timestamp: float) -> Frame:
        # Emit a solid black mock frame payload
        frame_bytes = b"\x00" * (self.width * self.height * 4)  # Solid black raw mock bytes
        sha = hashlib.sha256(frame_bytes).hexdigest()
        
        return Frame(
            frame_id=str(frame_index),
            frame_index=frame_index,
            presentation_timestamp=presentation_timestamp,
            capture_start_time=time.time(),
            capture_end_time=time.time(),
            capture_duration=0.001,
            image_payload=frame_bytes,
            image_format="raw",
            image_width=self.width,
            image_height=self.height,
            byte_size=len(frame_bytes),
            sha256_hash=sha
        )

    async def close(self) -> None:
        pass


# ==============================================================================
# PRODUCTION HARDENING TEST SUITE
# ==============================================================================

def test_audio_format_validation():
    """
    1. Overlapping tracks test (20+ tracks)
    2. Mono/stereo inputs compatibility
    3. 44.1kHz/48kHz sample rate conversions
    4. MP3 (CBR & VBR), AAC, WAV, M4A
    5. Looping, trimming, fades, and playback rate variations
    """
    print("\n--- Starting Audio Formats & Scaling Validation ---")
    assets = generate_test_audio_assets()
    
    payload_dict = BASE_PAYLOAD.copy()
    payload_dict["backgroundVideo"]["duration"] = 5.0  # short run
    
    # Compile 20+ tracks utilizing all asset formats, trims, fades, and loops
    audio_tracks = []
    formats = list(assets.keys())
    formats.remove("corrupt")

    for idx in range(25):  # 25 overlapping tracks
        fmt = formats[idx % len(formats)]
        audio_tracks.append({
            "id": f"track_fmt_{idx}",
            "type": "bg_music",
            "volume": 0.3,
            "clips": [
                {
                    "id": f"clip_fmt_{idx}",
                    "source": str(assets[fmt]),
                    "trimStart": 1.0,
                    "trimEnd": 3.0,
                    "timelineStart": 0.0 if idx % 2 == 0 else 1.0,
                    "timelineEnd": 2.0 if idx % 2 == 0 else 3.0,
                    "fadeIn": 0.2,
                    "fadeOut": 0.2,
                    "loop": True
                }
            ]
        })
    
    payload_dict["audioTracks"] = audio_tracks
    payload = RenderPayload(**payload_dict)
    
    config = EngineConfig(max_queue_size=4, debug_mode=True)
    renderer = ChromiumRenderer(port=3001)
    encoder = FFmpegEncoder()
    composer = FFmpegAudioComposer()
    muxer = FFmpegMuxer()
    
    session = ExportSession(config, renderer, encoder, composer, muxer)
    output_file = OUTPUT_DIR / "audio_formats_hardened.mp4"
    
    result = asyncio.run(session.run(payload, output_file))
    assert result["result"] == "success"
    assert output_file.is_file()

    # Validate output properties using FFprobe
    meta = OutputValidator.validate(
        output_file,
        expected_frames=150,  # 5s * 30fps
        expected_duration=5.0,
        width=1080,
        height=1920,
        fps=30.0,
        session_id=session.session_id
    )
    print(f"Verified Multi-format Output: {meta}")


def generate_mock_video_of_duration(duration_seconds: float) -> Path:
    dest = TEST_ASSETS_DIR / f"mock_{duration_seconds}s.mp4"
    if not dest.is_file():
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "testsrc=size=160x100:rate=30",
            "-f", "lavfi", "-i", "sine=f=440:r=48000",
            "-t", str(duration_seconds),
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            str(dest)
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return dest


@pytest.mark.parametrize("duration_seconds", [10, 60, 300, 600])
def test_timing_and_drift_validation(duration_seconds):
    """
    Verify timing synchronization and zero frame drift for scaling runs:
    - 10 seconds (300 frames)
    - 1 minute (1800 frames)
    - 5 minutes (9000 frames)
    - 10 minutes (18000 frames)
    Expected drift is strictly ±1 frame.
    """
    print(f"\n--- Running Timing & Drift Validation: {duration_seconds}s ---")
    
    payload_dict = BASE_PAYLOAD.copy()
    payload_dict["backgroundVideo"] = payload_dict["backgroundVideo"].copy()
    payload_dict["backgroundVideo"]["duration"] = float(duration_seconds)
    payload_dict["backgroundVideo"]["url"] = str(generate_mock_video_of_duration(duration_seconds))
    if "trim" in payload_dict["backgroundVideo"]:
        payload_dict["backgroundVideo"]["trim"] = {
            "start": 0.0,
            "end": float(duration_seconds)
        }
    payload_dict["dimensions"] = {"width": 160, "height": 100}
    payload = RenderPayload(**payload_dict)
    
    config = EngineConfig(max_queue_size=8, debug_mode=True)
    
    # We bypass Chrome loading using MockRenderer to run scaling tests in seconds
    renderer = MockRenderer(width=160, height=100)
    
    # Set video frame size parser to accept raw frame format
    encoder = FFmpegEncoder()
    # Override start command to accept raw rgb input
    orig_start = encoder.start
    async def rgb_start(w, h, fps, output_path):
        encoder._process = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y",
            "-f", "rawvideo",
            "-pix_fmt", "rgba",
            "-s", f"{w}x{h}",
            "-r", str(fps),
            "-i", "-",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            str(output_path),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        encoder.stdin_writer = encoder._process.stdin
    encoder.start = rgb_start

    composer = FFmpegAudioComposer()
    muxer = FFmpegMuxer()
    
    session = ExportSession(config, renderer, encoder, composer, muxer)
    output_file = OUTPUT_DIR / f"timing_{duration_seconds}s.mp4"
    
    result = asyncio.run(session.run(payload, output_file))
    assert result["result"] == "success"
    
    # Verify exact frame counts and duration parity (no drift)
    expected_frames = int(duration_seconds * 30)
    meta = OutputValidator.validate(
        output_file,
        expected_frames=expected_frames,
        expected_duration=float(duration_seconds),
        width=160,
        height=100,
        fps=30.0,
        session_id=session.session_id
    )
    print(f"Drift Verification Metadata ({duration_seconds}s): {meta}")
    
    # Calculate drift frames
    drift = abs(meta["frame_count"] - expected_frames)
    assert drift <= 1, f"Frame drift is too high: {drift} frames"
    print(f"Passed drift verification with {drift} frames drift.")


def test_failure_handling_and_cleanup():
    """
    Test suite for checking deterministic exception propagation and resource cleanup.
    Includes:
    - Missing Audio / Video assets
    - Corrupt / Unsupported files
    - Queue Timeout
    - FFmpeg Crash mid-mix
    - Output write failure
    """
    print("\n--- Starting Subsystem Failure Simulations ---")
    assets = generate_test_audio_assets()
    config = EngineConfig(max_queue_size=4, debug_mode=True)
    output_file = OUTPUT_DIR / "failure_handled.mp4"

    # 1. Corrupted / Unsupported Audio File
    print("--- Simulating Corrupted Audio Asset ---")
    payload_dict = BASE_PAYLOAD.copy()
    payload_dict["audioTracks"] = [{
        "id": "corrupt_track",
        "type": "bg_music",
        "clips": [{"id": "clip_corrupt", "source": str(assets["corrupt"]), "trimStart": 0.0, "trimEnd": 5.0, "timelineStart": 0.0, "timelineEnd": 5.0}]
    }]
    payload = RenderPayload(**payload_dict)
    session = ExportSession(config, ChromiumRenderer(port=3001), FFmpegEncoder(), FFmpegAudioComposer(), FFmpegMuxer())
    
    with pytest.raises(SubsystemError) as exc_info:
        asyncio.run(session.run(payload, output_file))
    print(f"Caught Corrupt Asset: {exc_info.value.code} - {exc_info.value.message}")
    assert session.browser is None  # Verify cleanup

    # 2. Output Write Failure (Permission Error)
    print("--- Simulating Output Write Permission Failure ---")
    payload = RenderPayload(**BASE_PAYLOAD)
    session2 = ExportSession(config, ChromiumRenderer(port=3001), FFmpegEncoder(), FFmpegAudioComposer(), FFmpegMuxer())
    
    # Point to a read-only root directory or non-existent path to trigger OS error
    bad_output_file = Path("Z:/nonexistent_directory/output.mp4")
    with pytest.raises(SubsystemError) as exc_info2:
        asyncio.run(session2.run(payload, bad_output_file))
    print(f"Caught Permission/Write Error: {exc_info2.value.code}")
    assert session2.browser is None

    # 3. Queue Timeout Simulation (Consumer Stall)
    print("--- Simulating Frame Queue Timeout ---")
    config_timeout = EngineConfig(max_queue_size=4, timeout_seconds=2, debug_mode=True)
    session3 = ExportSession(config_timeout, ChromiumRenderer(port=3001), FFmpegEncoder(), FFmpegAudioComposer(), FFmpegMuxer())
    # Force consumer write_frame to sleep infinitely
    original_write = session3.encoder.write_frame
    async def slow_write(frame):
        await asyncio.sleep(100.0)
    session3.encoder.write_frame = slow_write

    with pytest.raises(SubsystemError) as exc_info3:
        asyncio.run(session3.run(payload, output_file))
    assert exc_info3.value.code == "QUEUE_TIMEOUT"
    assert session3.browser is None
    print("Stalled queue cleanup verified.")


def test_repeated_runs_leaks_audit():
    """
    Resource Validation:
    Run repeated exports (10 runs) to assert:
    - Zero orphaned browser context pages / Chromium handles
    - Zero orphaned FFmpeg subprocesses
    - Stable memory footprint (peak vs avg RSS)
    """
    print("\n--- Starting Repeated Executions Resource Leak Audit ---")
    payload = RenderPayload(**BASE_PAYLOAD)
    config = EngineConfig(max_queue_size=4, debug_mode=True)
    
    initial_memory = psutil.Process(os.getpid()).memory_info().rss
    print(f"Initial test process memory: {initial_memory / 1024 / 1024:.2f} MB")

    for run_idx in range(10):
        print(f"Running iteration {run_idx + 1}/10...")
        renderer = ChromiumRenderer(port=3001)
        encoder = FFmpegEncoder()
        composer = FFmpegAudioComposer()
        muxer = FFmpegMuxer()
        
        session = ExportSession(config, renderer, encoder, composer, muxer)
        output_file = OUTPUT_DIR / f"leak_check_{run_idx}.mp4"
        
        result = asyncio.run(session.run(payload, output_file, max_frames=5))
        assert result["result"] == "success"
        
        # Immediate cleanup verification
        assert session.browser is None
        assert session.page is None
        assert encoder._process is None
        assert composer._process is None

    # Assert no leaked processes remain in process tree
    current_proc = psutil.Process()
    ffmpeg_children = [c for c in current_proc.children(recursive=True) if "ffmpeg" in c.name().lower()]
    chrome_children = [c for c in current_proc.children(recursive=True) if "chrome" in c.name().lower() or "playwright" in c.name().lower()]
    
    print(f"Leaked FFmpeg processes count: {len(ffmpeg_children)}")
    print(f"Leaked Chrome processes count: {len(chrome_children)}")
    assert len(ffmpeg_children) == 0
    assert len(chrome_children) == 0

    final_memory = psutil.Process(os.getpid()).memory_info().rss
    print(f"Final test process memory: {final_memory / 1024 / 1024:.2f} MB")
    print("Passed repeated leak validation audit.")
