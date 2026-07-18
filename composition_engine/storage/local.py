import os
import shutil
import urllib.parse
from pathlib import Path
from typing import Any, Dict
from composition_engine.encoders.storage import StorageProvider, UploadContext
from composition_engine.encoders.base import SubsystemError

class LocalFilesystemStorageProvider(StorageProvider):
    def __init__(self, root_dir: Path):
        self.root_dir = Path(root_dir).resolve()
        self.root_dir.mkdir(parents=True, exist_ok=True)

    async def upload(self, local_path: Path, remote_key: str, context: UploadContext) -> str:
        if not local_path.is_file():
            raise FileNotFoundError(f"Local file does not exist: {local_path}")
        
        dest = self.root_dir / remote_key
        dest.parent.mkdir(parents=True, exist_ok=True)
        
        # Simulate cancellation and chunks
        if context.cancellation_token.is_cancelled:
            raise SubsystemError("CANCELED", "Upload canceled.", "storage")
            
        shutil.copy2(local_path, dest)
        return dest.as_uri()

    async def delete(self, remote_key: str) -> None:
        dest = self.root_dir / remote_key
        if dest.is_file():
            dest.unlink()

    async def exists(self, remote_key: str) -> bool:
        return (self.root_dir / remote_key).is_file()

    async def signed_url(self, remote_key: str, expires_in: int) -> str:
        # Returns simple file URI as mock signed URL
        dest = self.root_dir / remote_key
        return dest.as_uri()

    async def metadata(self, remote_key: str) -> Dict[str, Any]:
        dest = self.root_dir / remote_key
        if not dest.is_file():
            raise FileNotFoundError(f"File not found: {remote_key}")
        return {
            "size_bytes": str(dest.stat().st_size),
            "modified_time": str(dest.stat().st_mtime)
        }

    async def copy(self, source_key: str, dest_key: str) -> None:
        src = self.root_dir / source_key
        dest = self.root_dir / dest_key
        if not src.is_file():
            raise FileNotFoundError(f"Source file not found: {source_key}")
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
