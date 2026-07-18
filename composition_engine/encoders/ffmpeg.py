import asyncio
import os
import sys
from pathlib import Path
from typing import Optional
from composition_engine.encoders.base import Encoder, Frame, EncoderError

class FFmpegEncoder(Encoder):
    def __init__(self):
        self._process: Optional[asyncio.subprocess.Process] = None
        self._output_path: Optional[Path] = None
        self._session_id: str = "default_session"

    async def start(self, width: int, height: int, fps: float, output_path: Path) -> None:
        self._output_path = output_path
        
        # Build the command line argument list
        # Input: image2pipe, format png, framerate fps
        # Output: libx264, yuv420p format, no audio (-an), overwrite (-y)
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "image2pipe",
            "-vcodec", "png",
            "-r", str(fps),
            "-i", "-",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-an",
            str(output_path)
        ]

        try:
            self._process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
        except Exception as e:
            raise EncoderError(
                code="SUBPROCESS_FAILED",
                message=f"Failed to spawn FFmpeg process: {str(e)}",
                session_id=self._session_id,
                root_cause=str(e)
            )

    async def write_frame(self, frame: Frame) -> None:
        if not self._process or self._process.returncode is not None:
            raise EncoderError(
                code="ENCODER_NOT_RUNNING",
                message="Cannot write frame: FFmpeg process is not running.",
                session_id=self._session_id
            )

        try:
            self._process.stdin.write(frame.image_payload)
            await self._process.stdin.drain()
        except (BrokenPipeError, ConnectionResetError) as e:
            # Subprocess terminated or stdin pipe broke
            stderr_data = b""
            try:
                stderr_data = await asyncio.wait_for(self._process.stderr.read(), timeout=1.0)
            except Exception:
                pass
            
            raise EncoderError(
                code="BROKEN_PIPE",
                message=f"FFmpeg stdin pipe broke: {stderr_data.decode('utf-8', errors='ignore')}",
                session_id=self._session_id,
                root_cause=str(e)
            )
        except Exception as e:
            raise EncoderError(
                code="WRITE_FAILED",
                message=f"Failed to write frame to FFmpeg: {str(e)}",
                session_id=self._session_id,
                root_cause=str(e)
            )

    async def flush(self) -> None:
        if self._process and self._process.stdin and not self._process.stdin.is_closing():
            try:
                await self._process.stdin.drain()
            except Exception:
                pass

    async def finalize(self) -> None:
        if not self._process:
            return

        try:
            if self._process.stdin and not self._process.stdin.is_closing():
                self._process.stdin.close()
                await self._process.stdin.wait_closed()
        except Exception:
            pass

        # Wait for the process to exit cleanly
        stdout, stderr = await self._process.communicate()
        exit_code = self._process.returncode

        if exit_code != 0:
            err_msg = stderr.decode("utf-8", errors="ignore") if stderr else "Unknown error"
            raise EncoderError(
                code="FINALIZATION_FAILED",
                message=f"FFmpeg exited with non-zero code {exit_code}. Stderr:\n{err_msg}",
                session_id=self._session_id
            )

    async def terminate(self) -> None:
        if not self._process:
            return

        try:
            if self._process.returncode is None:
                self._process.kill()
                await self._process.wait()
        except Exception:
            pass
        finally:
            self._process = None

    async def health_check(self) -> bool:
        if not self._process:
            return False
        # If returncode is set, it means the process has exited
        return self._process.returncode is None
