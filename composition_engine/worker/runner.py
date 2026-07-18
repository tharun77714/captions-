import os
import sys
import json
import time
import asyncio
import hashlib
import threading
from pathlib import Path
from typing import Any, Dict, Optional

from composition_engine.encoders.base import (
    EngineConfig, TimelineClock, ExportMetrics, EventBus, CancellationToken,
    PipelineContext, ExportState, SubsystemError, ExportError
)
from composition_engine.session import ExportSession
from composition_engine.renderers.chromium import ChromiumRenderer
from composition_engine.encoders.ffmpeg import FFmpegEncoder
from composition_engine.encoders.audio_composer import FFmpegAudioComposer, FFmpegMuxer
from composition_engine.models.payload import RenderPayload
from composition_engine.worker.repository import JobRepository
from composition_engine.worker.listener import ExportJobListener
from composition_engine.encoders.storage import UploadContext

class HeartbeatThread(threading.Thread):
    def __init__(self, repository: JobRepository, job_id: str, cancel_token: CancellationToken, get_version_fn):
        super().__init__(daemon=True)
        self.repository = repository
        self.job_id = job_id
        self.cancel_token = cancel_token
        self.get_version_fn = get_version_fn
        self.stopped = False

    def run(self):
        while not self.stopped and not self.cancel_token.is_cancelled:
            time.sleep(5)
            if self.stopped or self.cancel_token.is_cancelled:
                break
            try:
                job = self.repository.get_job(self.job_id)
                if job and job.get("cancel_requested"):
                    self.cancel_token.cancel()
                    print(f"[Heartbeat] Cancellation requested for job {self.job_id}", flush=True)
                    break
                
                current_ver = self.get_version_fn()
                updated = self.repository.heartbeat(self.job_id, current_ver)
                if updated:
                    self.repository.update_version_local(self.job_id, updated["version"])
            except Exception as e:
                print(f"[Heartbeat] Error: {e}", flush=True)

class WorkerRunner:
    def __init__(self, worker_id: str, repository: JobRepository, storage_provider: Any):
        self.worker_id = worker_id
        self.repository = repository
        self.storage_provider = storage_provider
        self.current_version = 1

    def get_current_version(self):
        return self.current_version

    async def execute_job(self, job_id: str, project_id: str) -> Dict[str, Any]:
        print(f"[Worker:{self.worker_id[:8]}] Claiming job {job_id[:8]}", flush=True)
        job = self.repository.claim_lease(job_id, self.worker_id)
        if not job:
            return {"status": "skipped", "reason": "could_not_claim_lease"}

        self.current_version = job["version"]
        snapshot = job.get("payload_snapshot")
        stored_hash = job.get("snapshot_hash")
        
        if not snapshot:
            err = "Missing payload_snapshot in job."
            self.repository.fail_job(job_id, self.current_version, err)
            raise ExportError("FATAL_ERROR", err, job_id)

        # Integrity verification
        serialized = json.dumps(snapshot, sort_keys=True)
        computed_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        if computed_hash != stored_hash:
            err = "Snapshot integrity verification failed."
            self.repository.fail_job(job_id, self.current_version, err)
            raise ExportError("FATAL_ERROR", err, job_id)

        payload = RenderPayload(**snapshot)
        cancel_token = CancellationToken()
        
        heartbeat_t = HeartbeatThread(self.repository, job_id, cancel_token, self.get_current_version)
        heartbeat_t.start()

        checkpoint_dir = Path(os.path.join(os.getenv("TEMP", "/tmp"), f"checkpoint_{job_id}"))
        final_video_path = checkpoint_dir / f"final_output_{job_id}.mp4"
        
        if final_video_path.is_file():
            print(f"[Worker] Checkpoint found! Final video file exists. Resuming upload...", flush=True)
            try:
                upload_url = await self._upload_output(job_id, final_video_path, cancel_token)
                metrics = job.get("metrics") or {}
                self.repository.complete_job(job_id, self.current_version, upload_url, metrics)
                heartbeat_t.stopped = True
                return {"status": "completed", "url": upload_url, "metrics": metrics}
            except Exception as e:
                print(f"[Worker] Checkpoint upload failed: {e}", flush=True)

        event_bus = EventBus()
        fps = payload.fps
        duration = payload.backgroundVideo.duration
        total_frames = int(duration * fps)
        
        listener = ExportJobListener(self.repository, job_id, self.current_version, total_frames)
        event_bus.subscribe(listener.handle_event)

        renderer = ChromiumRenderer(port=3001)
        encoder = FFmpegEncoder()
        composer = FFmpegAudioComposer()
        muxer = FFmpegMuxer()
        
        scratch_dir = Path(os.path.join(os.getenv("TEMP", "/tmp"), f"scratch_{job_id}"))
        scratch_dir.mkdir(parents=True, exist_ok=True)
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        output_file = checkpoint_dir / f"final_output_{job_id}.mp4"
        
        config = EngineConfig(max_queue_size=16, debug_mode=True)
        session = ExportSession(config, renderer, encoder, composer, muxer)
        session.session_id = job_id
        session.scratch_dir = scratch_dir
        session.cancellation_token = cancel_token
        session.event_bus = event_bus
        
        def sync_version(to_state: ExportState):
            self.current_version = listener.version
        session.state_machine.transition = lambda state: sync_version(state)

        start_time = time.perf_counter()
        try:
            res = await session.run(payload, output_file)
            metrics_obj = res.get("metrics")
            
            self.current_version = listener.version
            updated = self.repository.update_job(job_id, self.current_version, status="uploading", progress=95, stage="Uploading final video to storage")
            if updated:
                self.current_version = updated["version"]
            
            upload_url = await self._upload_output(job_id, output_file, cancel_token)
            
            metrics = {
                "startup_ms": metrics_obj.renderer.browser_startup_ms,
                "hydration_ms": metrics_obj.renderer.payload_hydration_ms,
                "planning_ms": metrics_obj.planner.planning_duration_ms,
                "rendering_ms": metrics_obj.renderer.average_frame_latency_ms * total_frames,
                "encoding_ms": metrics_obj.encoder.encoding_duration_ms,
                "audio_ms": metrics_obj.audio.audio_mixing_ms,
                "mux_ms": metrics_obj.mux.muxing_duration_ms,
                "upload_ms": (time.perf_counter() - start_time) * 1000.0 - metrics_obj.total_export_duration_ms,
                "total_duration_ms": (time.perf_counter() - start_time) * 1000.0,
                "peak_memory_bytes": metrics_obj.peak_memory_bytes,
                "render_fps": fps,
                "frames_rendered": total_frames,
                "encoded_bytes": output_file.stat().st_size,
                "upload_bytes": output_file.stat().st_size,
                "retry_count": job.get("attempt_number", 1) - 1,
                "pipeline_duration": metrics_obj.total_export_duration_ms
            }

            self.repository.complete_job(job_id, self.current_version, upload_url, metrics)
            
            if output_file.is_file():
                output_file.unlink()
            if checkpoint_dir.exists():
                checkpoint_dir.rmdir()
                
            return {"status": "completed", "url": upload_url, "metrics": metrics}

        except Exception as e:
            self.repository.fail_job(job_id, listener.version, str(e))
            raise e
        finally:
            heartbeat_t.stopped = True
            await session.cleanup()

    async def _upload_output(self, job_id: str, output_file: Path, cancel_token: CancellationToken) -> str:
        ctx = UploadContext(
            cancellation_token=cancel_token,
            timeout_seconds=300.0,
            max_retries=3,
            metadata={"job_id": job_id}
        )
        remote_key = f"exports/{job_id}.mp4"
        return await self.storage_provider.upload(output_file, remote_key, ctx)
