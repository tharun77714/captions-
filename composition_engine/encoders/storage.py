import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict
from composition_engine.encoders.base import CancellationToken

@dataclass
class UploadContext:
    cancellation_token: CancellationToken
    timeout_seconds: float = 300.0
    max_retries: int = 3
    metadata: Dict[str, Any] = field(default_factory=dict)

class StorageProvider(ABC):
    @abstractmethod
    async def upload(self, local_path: Path, remote_key: str, context: UploadContext) -> str:
        """Uploads a file to remote storage under context constraints."""
        pass

    @abstractmethod
    async def delete(self, remote_key: str) -> None:
        """Deletes a file from remote storage."""
        pass

    @abstractmethod
    async def exists(self, remote_key: str) -> bool:
        """Checks if a file exists in remote storage."""
        pass

    @abstractmethod
    async def signed_url(self, remote_key: str, expires_in: int) -> str:
        """Generates a secure, short-lived signed GET URL."""
        pass

    @abstractmethod
    async def metadata(self, remote_key: str) -> Dict[str, Any]:
        """Gets metadata of the remote file."""
        pass

    @abstractmethod
    async def copy(self, source_key: str, dest_key: str) -> None:
        """Copies an object within remote storage."""
        pass
