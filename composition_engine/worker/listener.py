import time
from composition_engine.encoders.base import (
    PipelineEvent, AudioPlanningStarted, AudioPlanningCompleted,
    BrowserReady, PayloadHydrated, RenderingStarted, FrameEncoded,
    AudioMixingStarted, AudioMixingCompleted, MuxingStarted, MuxingCompleted,
    ExportCompleted, ExportFailed
)

class ExportJobListener:
    def __init__(self, repository, job_id: str, initial_version: int, total_frames: int = 300):
        self.repository = repository
        self.job_id = job_id
        self.version = initial_version
        self.total_frames = total_frames
        self.last_update_time = 0.0
        self.last_progress = -1

    def handle_event(self, event: PipelineEvent) -> None:
        status = None
        stage = None
        progress = None

        if isinstance(event, AudioPlanningStarted):
            status = "planning"
            stage = "Planning timeline execution"
            progress = 5
        elif isinstance(event, AudioPlanningCompleted):
            progress = 8
        elif isinstance(event, BrowserReady):
            status = "starting"
            stage = "Headless browser started"
            progress = 12
        elif isinstance(event, PayloadHydrated):
            stage = "Payload hydrated into Zustand store"
            progress = 15
        elif isinstance(event, RenderingStarted):
            status = "rendering"
            stage = "Rendering subtitle frames"
            progress = 20
        elif isinstance(event, FrameEncoded):
            idx = event.data.get("index", 0)
            status = "rendering"
            progress = int(20 + (idx / self.total_frames) * 50)  # rendering is 20%-70%
            stage = f"Rendering frames: {idx}/{self.total_frames}"
        elif isinstance(event, AudioMixingStarted):
            status = "mixing"
            stage = "Mixing audio channels"
            progress = 75
        elif isinstance(event, AudioMixingCompleted):
            progress = 80
        elif isinstance(event, MuxingStarted):
            status = "muxing"
            stage = "Muxing video and audio streams"
            progress = 85
        elif isinstance(event, MuxingCompleted):
            progress = 90
        elif isinstance(event, ExportCompleted):
            return
        elif isinstance(event, ExportFailed):
            return

        if status or stage or progress is not None:
            now = time.time()
            is_status_change = status is not None
            is_progress_milestone = progress is not None and progress != self.last_progress and (progress % 5 == 0)
            
            if is_status_change or is_progress_milestone or (now - self.last_update_time >= 0.5):
                try:
                    updated = self.repository.update_job(
                        job_id=self.job_id,
                        current_version=self.version,
                        status=status,
                        progress=progress,
                        stage=stage
                    )
                    if updated:
                        self.version = updated["version"]
                        self.last_update_time = now
                        if progress is not None:
                            self.last_progress = progress
                except Exception as e:
                    print(f"[JobListener] Failed to update job status: {e}", flush=True)
