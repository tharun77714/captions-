import os
import json
import asyncio
import hashlib
import tempfile
import time
from datetime import datetime, timezone, timedelta
import pytest
from pathlib import Path
from typing import Dict, Any

from composition_engine.encoders.base import EventBus, CancellationToken, SubsystemError
from composition_engine.encoders.storage import UploadContext
from composition_engine.storage.local import LocalFilesystemStorageProvider
from composition_engine.worker.repository import JobRepository
from composition_engine.worker.listener import ExportJobListener
from composition_engine.worker.runner import WorkerRunner
from composition_engine.worker.recovery import RetryClassifier, JobWatchdog

# Mock payload matching RenderPayload schema
MOCK_PAYLOAD = {
    "version": 3,
    "projectId": "test_proj_123",
    "dimensions": {"width": 160, "height": 100},
    "fps": 30,
    "backgroundVideo": {
        "url": "mock_video.mp4",
        "duration": 5.0
    },
    "subtitleStyle": {
        "_version": 3,
        "font": {"family": "Inter", "weight": 700, "italic": False, "underline": False, "textTransform": "none"},
        "fontSize": 24.0,
        "letterSpacing": 0.0,
        "wordSpacing": 0.0,
        "lineSpacing": 1.2,
        "textColor": {"mode": "solid", "solid": "#FFFFFF"},
        "stroke": {"enabled": False, "color": "#000000", "width": 0.0},
        "shadow": {"color": "rgba(0,0,0,0.5)", "blur": 0.0, "offsetX": 0.0, "offsetY": 0.0},
        "background": {"enabled": False, "color": "rgba(0,0,0,0.75)", "opacity": 1.0, "paddingX": 0.0, "paddingY": 0.0, "borderRadius": 0.0},
        "blur": 0.0,
        "alignment": "center",
        "positionX": 0.0,
        "positionY": 0.0,
        "highlightMode": "none",
        "activeWordColor": "#FFFFFF",
        "inactiveOpacity": 0.5,
        "transition": {"type": "none", "target": "word", "speedMode": "dynamic", "speed": 25},
        "overrides": {"wordStyles": {}, "segmentStyles": {}}
      },
    "segments": []
}

def test_storage_provider():
    with tempfile.TemporaryDirectory() as tmpdir:
        root_dir = Path(tmpdir) / "storage"
        provider = LocalFilesystemStorageProvider(root_dir)
        
        test_file = Path(tmpdir) / "test.txt"
        test_file.write_text("Hello Storage", encoding="utf-8")
        
        ctx = UploadContext(cancellation_token=CancellationToken())
        
        loop = asyncio.get_event_loop()
        url = loop.run_until_complete(provider.upload(test_file, "files/test.txt", ctx))
        assert url.startswith("file:///")
        assert (root_dir / "files" / "test.txt").is_file()
        assert (root_dir / "files" / "test.txt").read_text(encoding="utf-8") == "Hello Storage"
        
        assert loop.run_until_complete(provider.exists("files/test.txt")) is True
        assert loop.run_until_complete(provider.exists("files/missing.txt")) is False
        
        meta = loop.run_until_complete(provider.metadata("files/test.txt"))
        assert "size_bytes" in meta
        
        loop.run_until_complete(provider.copy("files/test.txt", "files/test_copy.txt"))
        assert (root_dir / "files" / "test_copy.txt").is_file()
        
        loop.run_until_complete(provider.delete("files/test.txt"))
        assert loop.run_until_complete(provider.exists("files/test.txt")) is False

def test_worker_leasing_and_optimistic_concurrency():
    repo = JobRepository(mock_mode=True)
    job_id = "test_job_123"
    worker_a = "worker_a_uuid"
    worker_b = "worker_b_uuid"
    
    job = repo.claim_lease(job_id, worker_a)
    assert job is not None
    assert job["status"] == "starting"
    assert job["lease_owner"] == worker_a
    assert job["version"] == 1
    
    job_b = repo.claim_lease(job_id, worker_b)
    assert job_b is None
    
    updated = repo.update_job(job_id, current_version=1, status="rendering", progress=30, stage="Rendering frames")
    assert updated is not None
    assert updated["status"] == "rendering"
    assert updated["version"] == 2
    
    with pytest.raises(SubsystemError) as exc_info:
        repo.update_job(job_id, current_version=1, status="mixing", progress=80, stage="Mixing audio")
    assert exc_info.value.code == "OPTIMISTIC_LOCK_ERROR"

def test_snapshot_integrity_verification():
    repo = JobRepository(mock_mode=True)
    job_id = "test_job_456"
    worker_id = "worker_a_uuid"
    
    repo.mock_db[job_id] = {
        "id": job_id,
        "project_id": "test_proj_123",
        "status": "queued",
        "payload_snapshot": MOCK_PAYLOAD,
        "snapshot_hash": "corrupt_hash_value",
        "revision_hash": "rev_hash",
        "version": 0,
        "attempt_number": 0,
        "max_attempts": 3
    }
    
    runner = WorkerRunner(worker_id, repo, LocalFilesystemStorageProvider(Path(".")))
    
    loop = asyncio.get_event_loop()
    with pytest.raises(SubsystemError) as exc_info:
        loop.run_until_complete(runner.execute_job(job_id, "test_proj_123"))
    assert exc_info.value.code == "FATAL_ERROR"
    
    job = repo.get_job(job_id)
    assert job["status"] == "failed"
    assert "integrity verification failed" in job["error"].lower()

def test_retry_classification():
    assert RetryClassifier.is_retryable("Network timeout connecting to server") is True
    assert RetryClassifier.is_retryable("Upload failed: 502 Bad Gateway") is True
    assert RetryClassifier.is_retryable("Missing asset: C:/Users/Kotha/missing.mp3") is False
    assert RetryClassifier.is_retryable("Validation Error: Invalid FPS") is False
    assert RetryClassifier.is_retryable("OptimisticLockError: stale write") is True

def test_recovery_and_checkpoint():
    repo = JobRepository(mock_mode=True)
    job_id = "test_job_789"
    
    with tempfile.TemporaryDirectory() as tmpdir:
        checkpoint_dir = Path(tmpdir) / f"checkpoint_{job_id}"
        checkpoint_dir.mkdir(parents=True, exist_ok=True)
        final_video_path = checkpoint_dir / f"final_output_{job_id}.mp4"
        final_video_path.write_text("Mock Video Stream", encoding="utf-8")
        
        orig_temp = os.environ.get("TEMP")
        os.environ["TEMP"] = tmpdir
        
        repo.mock_db[job_id] = {
            "id": job_id,
            "project_id": "test_proj_123",
            "status": "uploading",
            "payload_snapshot": MOCK_PAYLOAD,
            "snapshot_hash": hashlib.sha256(json.dumps(MOCK_PAYLOAD, sort_keys=True).encode("utf-8")).hexdigest(),
            "revision_hash": "rev_hash",
            "version": 0,
            "attempt_number": 0,
            "max_attempts": 3,
            "lease_until": (datetime.now(timezone.utc) - timedelta(seconds=10)).isoformat(),
            "metrics": {"total_duration_ms": 100}
        }
        
        storage = LocalFilesystemStorageProvider(Path(tmpdir) / "storage")
        runner = WorkerRunner("worker_uuid", repo, storage)
        
        loop = asyncio.get_event_loop()
        res = loop.run_until_complete(runner.execute_job(job_id, "test_proj_123"))
        assert res["status"] == "completed"
        assert res["url"].endswith("exports/test_job_789.mp4")
        
        job = repo.get_job(job_id)
        assert job["status"] == "completed"
        assert job["progress"] == 100
        
        if orig_temp:
            os.environ["TEMP"] = orig_temp
        else:
            os.environ.pop("TEMP")
