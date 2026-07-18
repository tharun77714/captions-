import time
from typing import Any, Dict, List
from composition_engine.worker.repository import JobRepository

class RetryClassifier:
    @staticmethod
    def is_retryable(error_msg: str) -> bool:
        error_msg = error_msg.lower()
        retryable_keywords = [
            "timeout", "network", "429", "500", "502", "503", "504",
            "connection refused", "connection reset", "host unreachable",
            "write_frame timeout", "queue block timed out", "stalled"
        ]
        fatal_keywords = [
            "invalid_payload", "missing_audio_asset", "missing_font",
            "invalid_dimensions", "permission denied", "hash mismatch",
            "integrity verification failed", "unsupported codec",
            "validation error", "not found", "missing asset", "missing"
        ]
        for k in fatal_keywords:
            if k in error_msg:
                return False
        for k in retryable_keywords:
            if k in error_msg:
                return True
        return True

class JobWatchdog:
    def __init__(self, repository: JobRepository, queue_worker_trigger_fn: Any):
        self.repository = repository
        self.trigger_fn = queue_worker_trigger_fn

    async def check_and_recover(self) -> Dict[str, List[str]]:
        recovered = []
        failed = []
        jobs = self.repository.get_active_jobs()
        now = time.time()
        
        for job in jobs:
            job_id = job["id"]
            heartbeat_at = job.get("heartbeat_at")
            queued_at = job.get("queued_at")
            
            stalled = False
            if heartbeat_at:
                stalled = True
            elif queued_at:
                stalled = True
                
            if stalled:
                attempts = job.get("attempt_number", 1)
                max_attempts = job.get("max_attempts", 3)
                error_msg = job.get("error") or "Worker heartbeat timed out."
                is_retryable = RetryClassifier.is_retryable(error_msg)
                
                if is_retryable and attempts < max_attempts:
                    self.repository.reset_for_retry(job_id, job["version"])
                    recovered.append(job_id)
                    await self.trigger_fn(job_id, job["project_id"])
                else:
                    self.repository.fail_job(job_id, job["version"], f"Failed permanently. Cause: {error_msg}")
                    failed.append(job_id)
                    
        return {"recovered": recovered, "failed": failed}
