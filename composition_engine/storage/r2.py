import os
import asyncio
from pathlib import Path
from typing import Any, Dict, Optional
from composition_engine.encoders.storage import StorageProvider, UploadContext
from composition_engine.encoders.base import SubsystemError

try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False

class CloudflareR2StorageProvider(StorageProvider):
    def __init__(self, account_id: Optional[str] = None, access_key_id: Optional[str] = None, secret_access_key: Optional[str] = None, bucket_name: Optional[str] = None):
        self.account_id = account_id or os.getenv("R2_ACCOUNT_ID")
        self.access_key_id = access_key_id or os.getenv("R2_ACCESS_KEY_ID")
        self.secret_access_key = secret_access_key or os.getenv("R2_SECRET_ACCESS_KEY")
        self.bucket_name = bucket_name or os.getenv("R2_BUCKET_NAME", "vidyut-media-production")
        
        self.client = None
        if BOTO3_AVAILABLE and self.account_id and self.access_key_id and self.secret_access_key:
            self.client = boto3.client(
                "s3",
                endpoint_url=f"https://{self.account_id}.r2.cloudflarestorage.com",
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                config=Config(signature_version="s3v4")
            )

    def _ensure_client(self):
        if not self.client:
            raise SubsystemError(
                "STORAGE_CLIENT_NOT_INITIALIZED",
                f"R2 storage client is not configured or boto3 is not installed. Boto3: {BOTO3_AVAILABLE}",
                "global"
            )

    async def upload(self, local_path: Path, remote_key: str, context: UploadContext) -> str:
        self._ensure_client()
        if not local_path.is_file():
            raise FileNotFoundError(f"Local file does not exist: {local_path}")

        # Run boto3 call in executor to keep it async friendly
        def _upload():
            attempt = 0
            while attempt < context.max_retries:
                if context.cancellation_token.is_cancelled:
                    raise SubsystemError("CANCELED", "Upload canceled.", "storage")
                try:
                    self.client.upload_file(
                        Filename=str(local_path),
                        Bucket=self.bucket_name,
                        Key=remote_key,
                        ExtraArgs={"Metadata": context.metadata}
                    )
                    return f"https://{self.bucket_name}.r2.cloudflarestorage.com/{remote_key}"
                except Exception as e:
                    attempt += 1
                    if attempt >= context.max_retries:
                        raise SubsystemError("UPLOAD_FAILED", f"Upload failed after {attempt} attempts: {str(e)}", "storage", root_cause=str(e))
                    time_sleep = 2 ** attempt
                    time.sleep(time_sleep)

        return await asyncio.get_event_loop().run_in_executor(None, _upload)

    async def delete(self, remote_key: str) -> None:
        self._ensure_client()
        def _delete():
            try:
                self.client.delete_object(Bucket=self.bucket_name, Key=remote_key)
            except ClientError as e:
                raise SubsystemError("DELETE_FAILED", f"Failed to delete {remote_key}: {str(e)}", "storage")
        await asyncio.get_event_loop().run_in_executor(None, _delete)

    async def exists(self, remote_key: str) -> bool:
        self._ensure_client()
        def _exists():
            try:
                self.client.head_object(Bucket=self.bucket_name, Key=remote_key)
                return True
            except ClientError as e:
                if e.response['Error']['Code'] == "404":
                    return False
                raise SubsystemError("EXISTS_CHECK_FAILED", f"Failed to verify existence of {remote_key}", "storage")
        return await asyncio.get_event_loop().run_in_executor(None, _exists)

    async def signed_url(self, remote_key: str, expires_in: int) -> str:
        self._ensure_client()
        def _sign():
            try:
                return self.client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket_name, "Key": remote_key},
                    ExpiresIn=expires_in
                )
            except Exception as e:
                raise SubsystemError("SIGNING_FAILED", f"Failed to sign URL: {str(e)}", "storage")
        return await asyncio.get_event_loop().run_in_executor(None, _sign)

    async def metadata(self, remote_key: str) -> Dict[str, Any]:
        self._ensure_client()
        def _meta():
            try:
                resp = self.client.head_object(Bucket=self.bucket_name, Key=remote_key)
                return resp.get("Metadata", {})
            except Exception as e:
                raise SubsystemError("METADATA_FAILED", f"Failed to fetch metadata: {str(e)}", "storage")
        return await asyncio.get_event_loop().run_in_executor(None, _meta)

    async def copy(self, source_key: str, dest_key: str) -> None:
        self._ensure_client()
        def _copy():
            try:
                self.client.copy_object(
                    Bucket=self.bucket_name,
                    CopySource={"Bucket": self.bucket_name, "Key": source_key},
                    Key=dest_key
                )
            except Exception as e:
                raise SubsystemError("COPY_FAILED", f"Failed to copy object: {str(e)}", "storage")
        await asyncio.get_event_loop().run_in_executor(None, _copy)
