import os
import uuid
import asyncio
import modal
from pathlib import Path

# Locate the project root on the host machine
project_root = Path(__file__).resolve().parents[1]

# Define the Modal image with the necessary system libraries, playwright, and code directories mounted
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git", "libnss3", "libnspr4", "libatk1.0-0", "libatk-bridge2.0-0", "libcups2", "libdrm2", "libxkbcommon0", "libxcomposite1", "libxdamage1", "libxrandr2", "libgbm1", "libasound2", "libpango-1.0-0", "libcairo2", "libasound2-dev")
    .pip_install(
        "playwright>=1.40.0",
        "supabase>=2.4.5",
        "boto3>=1.34.101",
        "httpx>=0.25.0",
        "psutil>=5.9.0",
        "pydantic>=2.0.0",
        "pillow>=10.0.0",
        "fastapi"
    )
    .run_commands("playwright install chromium")
    .add_local_dir(str(project_root / "composition_engine"), "/root/composition_engine")
    .add_local_dir(str(project_root / "trust"), "/root/trust")
)

app = modal.App(name="vidyut-exporter")

@app.function(
    image=image,
    gpu="T4",
    timeout=3600,
    secrets=[modal.Secret.from_name("vidyut-secrets")]
)
async def run_job(job_id: str, project_id: str):
    from composition_engine.worker.repository import JobRepository
    from composition_engine.worker.runner import WorkerRunner
    from composition_engine.storage.r2 import CloudflareR2StorageProvider

    # Initialize repository and storage provider inside container
    repo = JobRepository()
    storage = CloudflareR2StorageProvider()
    
    runner = WorkerRunner(
        worker_id=str(uuid.uuid4()),
        repository=repo,
        storage_provider=storage
    )
    
    print(f"[ModalWorker] Starting job execution: job_id={job_id}, project_id={project_id}")
    await runner.execute_job(job_id, project_id)
    print(f"[ModalWorker] Job execution finished successfully: job_id={job_id}")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("vidyut-secrets")]
)
@modal.fastapi_endpoint(method="POST")
async def trigger_export(data: dict):
    job_id = data.get("job_id")
    project_id = data.get("project_id")
    
    if not job_id or not project_id:
        return {"error": "Missing job_id or project_id"}, 400
        
    print(f"[ModalWebhook] Received export request: job_id={job_id}, project_id={project_id}")
    # Spawn the run_job function asynchronously on Modal GPU
    run_job.spawn(job_id, project_id)
    return {"status": "started", "job_id": job_id}
