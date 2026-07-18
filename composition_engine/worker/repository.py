import os
import json
import httpx
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from composition_engine.encoders.base import SubsystemError

class JobRepository:
    def __init__(self, supabase_url: Optional[str] = None, service_role_key: Optional[str] = None, mock_mode: bool = False):
        self.supabase_url = supabase_url
        self.service_role_key = service_role_key
        self.mock_mode = mock_mode
        self.mock_db: Dict[str, Dict[str, Any]] = {}
        
        if not self.supabase_url or not self.service_role_key:
            env_path = Path(__file__).resolve().parents[2] / ".env.local"
            if env_path.is_file():
                lines = env_path.read_text(encoding="utf-8").splitlines()
                for line in lines:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        parts = line.split("=", 1)
                        k = parts[0].strip()
                        v = parts[1].strip().strip('"').strip("'")
                        if k == "NEXT_PUBLIC_SUPABASE_URL" and not self.supabase_url:
                            self.supabase_url = v
                        elif k == "SUPABASE_SERVICE_ROLE_KEY" and not self.service_role_key:
                            self.service_role_key = v
        
        if not self.supabase_url or not self.service_role_key:
            self.mock_mode = True

        self.headers = {}
        if not self.mock_mode:
            self.headers = {
                "apikey": self.service_role_key,
                "Authorization": f"Bearer {self.service_role_key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        if self.mock_mode:
            return self.mock_db.get(job_id)
        
        try:
            res = httpx.get(f"{self.supabase_url}/rest/v1/export_jobs?id=eq.{job_id}&select=*", headers=self.headers)
            if res.status_code == 200:
                data = res.json()
                return data[0] if data else None
        except Exception as e:
            print(f"[Repository] Fetch job error: {e}", flush=True)
        return None

    def get_active_jobs(self) -> List[Dict[str, Any]]:
        if self.mock_mode:
            return [j for j in self.mock_db.values() if j["status"] not in ["completed", "failed", "cancelled"]]
        
        try:
            res = httpx.get(f"{self.supabase_url}/rest/v1/export_jobs?status=in.(queued,starting,planning,rendering,encoding,mixing,muxing,uploading)&select=*", headers=self.headers)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            print(f"[Repository] Fetch active jobs error: {e}", flush=True)
        return []

    def claim_lease(self, job_id: str, worker_id: str, lease_duration_seconds: int = 300) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        lease_until = datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() + lease_duration_seconds, timezone.utc).isoformat()
        
        if self.mock_mode:
            job = self.mock_db.setdefault(job_id, {
                "id": job_id, "project_id": "mock_proj", "status": "queued",
                "attempt_number": 0, "max_attempts": 3, "version": 0, "payload_snapshot": {}
            })
            
            is_claimable = job["status"] == "queued" or (job.get("lease_until") and datetime.fromisoformat(job["lease_until"]) < datetime.now(timezone.utc))
            if is_claimable:
                job["status"] = "starting"
                job["lease_owner"] = worker_id
                job["lease_until"] = lease_until
                job["started_at"] = now
                job["attempt_number"] += 1
                job["version"] += 1
                return job
            return None

        job = self.get_job(job_id)
        if not job:
            return None

        current_ver = job.get("version", 1)
        current_attempt = job.get("attempt_number", 0)
        
        body = {
            "status": "starting",
            "lease_owner": worker_id,
            "lease_until": lease_until,
            "started_at": now,
            "attempt_number": current_attempt + 1,
            "version": current_ver + 1
        }
        
        try:
            url = f"{self.supabase_url}/rest/v1/export_jobs?id=eq.{job_id}&version=eq.{current_ver}&or=(status.eq.queued,lease_until.lt.{now})"
            res = httpx.patch(url, headers=self.headers, json=body)
            if res.status_code == 200:
                data = res.json()
                return data[0] if data else None
        except Exception as e:
            print(f"[Repository] Claim lease error: {e}", flush=True)
        return None

    def update_job(self, job_id: str, current_version: int, status: Optional[str] = None, progress: Optional[int] = None, stage: Optional[str] = None) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        body = {
            "version": current_version + 1,
            "heartbeat_at": now
        }
        if status: body["status"] = status
        if progress is not None: body["progress"] = progress
        if stage: body["stage"] = stage

        if self.mock_mode:
            job = self.mock_db.get(job_id)
            if not job or job.get("version") != current_version:
                raise SubsystemError("OPTIMISTIC_LOCK_ERROR", "database", "Stale write detected (mock DB).", False, job_id)
            job.update(body)
            return job

        try:
            url = f"{self.supabase_url}/rest/v1/export_jobs?id=eq.{job_id}&version=eq.{current_version}"
            res = httpx.patch(url, headers=self.headers, json=body)
            if res.status_code == 200:
                data = res.json()
                if data:
                    if status:
                        self._sync_project_status(job["project_id"], status)
                    return data[0]
            raise SubsystemError("OPTIMISTIC_LOCK_ERROR", "database", "Stale write: record updated by another process.", False, job_id)
        except Exception as e:
            if isinstance(e, SubsystemError): raise e
            print(f"[Repository] Update job error: {e}", flush=True)
            raise SubsystemError("DATABASE_ERROR", "database", str(e), False, job_id)

    def heartbeat(self, job_id: str, current_version: int) -> Optional[Dict[str, Any]]:
        return self.update_job(job_id, current_version)

    def update_version_local(self, job_id: str, new_version: int):
        if self.mock_mode:
            job = self.mock_db.get(job_id)
            if job: job["version"] = new_version

    def complete_job(self, job_id: str, current_version: int, output_url: str, metrics: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        body = {
            "status": "completed",
            "progress": 100,
            "stage": "Finished",
            "output_url": output_url,
            "metrics": metrics,
            "completed_at": now,
            "version": current_version + 1
        }
        if self.mock_mode:
            job = self.mock_db.get(job_id)
            if job: job.update(body)
            return job

        try:
            job = self.get_job(job_id)
            url = f"{self.supabase_url}/rest/v1/export_jobs?id=eq.{job_id}&version=eq.{current_version}"
            res = httpx.patch(url, headers=self.headers, json=body)
            if res.status_code == 200:
                data = res.json()
                if data:
                    self._sync_project_status(job["project_id"], "completed", output_url)
                    return data[0]
        except Exception as e:
            print(f"[Repository] Complete job error: {e}", flush=True)
        return None

    def fail_job(self, job_id: str, current_version: int, error_msg: str) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        body = {
            "status": "failed",
            "stage": "Error encountered",
            "error": error_msg,
            "failed_at": now,
            "version": current_version + 1
        }
        if self.mock_mode:
            job = self.mock_db.get(job_id)
            if job: job.update(body)
            return job

        try:
            job = self.get_job(job_id)
            url = f"{self.supabase_url}/rest/v1/export_jobs?id=eq.{job_id}&version=eq.{current_version}"
            res = httpx.patch(url, headers=self.headers, json=body)
            if res.status_code == 200:
                data = res.json()
                if data:
                    self._sync_project_status(job["project_id"], "failed", error_msg=error_msg)
                    return data[0]
        except Exception as e:
            print(f"[Repository] Fail job error: {e}", flush=True)
        return None

    def reset_for_retry(self, job_id: str, current_version: int) -> Optional[Dict[str, Any]]:
        body = {
            "status": "queued",
            "progress": 0,
            "stage": "Requeued for processing",
            "lease_owner": None,
            "lease_until": None,
            "version": current_version + 1
        }
        if self.mock_mode:
            job = self.mock_db.get(job_id)
            if job: job.update(body)
            return job

        try:
            url = f"{self.supabase_url}/rest/v1/export_jobs?id=eq.{job_id}&version=eq.{current_version}"
            res = httpx.patch(url, headers=self.headers, json=body)
            if res.status_code == 200:
                data = res.json()
                return data[0] if data else None
        except Exception as e:
            print(f"[Repository] Reset job error: {e}", flush=True)
        return None

    def _sync_project_status(self, project_id: str, status: str, url: Optional[str] = None, error_msg: Optional[str] = None):
        mapped = "exporting"
        if status in ["completed", "failed"]:
            mapped = status
        
        body = {"export_status": mapped}
        if url: body["export_url"] = url
        if error_msg: body["export_error"] = error_msg

        try:
            httpx.patch(
                f"{self.supabase_url}/rest/v1/projects?id=eq.{project_id}",
                headers=self.headers,
                json=body
            )
        except Exception as e:
            print(f"[Repository] Sync project status error: {e}", flush=True)
