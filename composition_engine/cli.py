import sys
import asyncio
import uuid
from composition_engine.worker.repository import JobRepository
from composition_engine.worker.runner import WorkerRunner
from composition_engine.storage.local import LocalFilesystemStorageProvider
from pathlib import Path

async def main():
    if len(sys.argv) < 3:
        print("Usage: python -m composition_engine.cli <jobId> <projectId>")
        sys.exit(1)
        
    job_id = sys.argv[1]
    project_id = sys.argv[2]
    
    repo = JobRepository()
    local_dir = Path("C:/Users/Kotha/Desktop/varun/vidyut/trust/artifacts/local_storage")
    storage = LocalFilesystemStorageProvider(local_dir)
    
    runner = WorkerRunner(
        worker_id=str(uuid.uuid4()),
        repository=repo,
        storage_provider=storage
    )
    
    try:
        await runner.execute_job(job_id, project_id)
    except Exception as e:
        print(f"CLI Runner failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
