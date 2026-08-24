import asyncio
import io
import logging
from pathlib import Path
from typing import Optional
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from app.core.config import settings

logger = logging.getLogger("linguamaxima.storage")

class StorageService:
    def __init__(self):
        self._s3_client = None
        self.backend = settings.audio_storage_backend.lower()

        # Ensure local media directory exists if using local backend or running containerized
        if not settings.is_serverless or self.backend == "local":
            try:
                settings.audio_dir.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                logger.warning(f"Could not create local audio dir: {e}")

    def _get_s3_client(self):
        """Initializes and returns a cached boto3 S3 client for Cloudflare R2."""
        if self._s3_client is None:
            endpoint_url = f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"
            self._s3_client = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                aws_access_key_id=settings.r2_access_key_id,
                aws_secret_access_key=settings.r2_secret_access_key,
                region_name="auto",
                config=Config(
                    signature_version="s3v4",
                    retries={"max_attempts": 3, "mode": "standard"},
                ),
            )
        return self._s3_client

    def _get_r2_public_url(self, key: str) -> str:
        """Constructs public URL for an R2 object."""
        if settings.r2_public_url_prefix:
            prefix = settings.r2_public_url_prefix.rstrip("/")
            return f"{prefix}/{key}"
        return f"https://{settings.r2_bucket_name}.{settings.r2_account_id}.r2.cloudflarestorage.com/{key}"

    async def audio_exists(self, filename: str) -> Optional[str]:
        """
        Checks if an audio file already exists in the configured storage.
        Returns the resolved URL if found, else None.
        """
        if self.backend in ("r2", "s3"):
            if not (settings.r2_account_id and settings.r2_access_key_id and settings.r2_secret_access_key):
                logger.warning("R2 storage selected but credentials not fully set. Checking local disk...")
                return self._check_local_exists(filename)

            key = f"audio/{filename}"
            try:
                def _check_r2():
                    client = self._get_s3_client()
                    client.head_object(Bucket=settings.r2_bucket_name, Key=key)
                    return True

                exists = await asyncio.to_thread(_check_r2)
                if exists:
                    return self._get_r2_public_url(key)
            except ClientError as e:
                # 404 Not Found is expected if file doesn't exist
                if e.response.get("Error", {}).get("Code") not in ("404", "NoSuchKey"):
                    logger.warning(f"R2 head_object error for {key}: {e}")
            except Exception as e:
                logger.warning(f"Failed to check R2 for {key}: {e}")

            return None

        return self._check_local_exists(filename)

    def _check_local_exists(self, filename: str) -> Optional[str]:
        file_path = settings.audio_dir / filename
        if file_path.exists() and file_path.stat().st_size > 0:
            return f"/api/v1/media/audio/{filename}"
        return None

    async def upload_audio(
        self,
        filename: str,
        data: bytes,
        content_type: str = "audio/mpeg"
    ) -> Optional[str]:
        """
        Persists audio bytes to the configured storage backend (local disk or Cloudflare R2).
        Returns the accessible URL.
        """
        if not data:
            return None

        if self.backend in ("r2", "s3"):
            if not (settings.r2_account_id and settings.r2_access_key_id and settings.r2_secret_access_key):
                logger.error("Cannot upload to R2: R2 credentials missing in configuration.")
                return await self._save_local_audio(filename, data)

            key = f"audio/{filename}"
            try:
                def _upload_to_r2():
                    client = self._get_s3_client()
                    client.put_object(
                        Bucket=settings.r2_bucket_name,
                        Key=key,
                        Body=data,
                        ContentType=content_type,
                    )

                await asyncio.to_thread(_upload_to_r2)
                public_url = self._get_r2_public_url(key)
                logger.info(f"Successfully uploaded audio to Cloudflare R2: {public_url}")
                return public_url
            except Exception as e:
                logger.error(f"Failed uploading audio to Cloudflare R2: {e}")
                # Fallback to local if possible
                return await self._save_local_audio(filename, data)

        return await self._save_local_audio(filename, data)

    async def _save_local_audio(self, filename: str, data: bytes) -> Optional[str]:
        try:
            settings.audio_dir.mkdir(parents=True, exist_ok=True)
            file_path = settings.audio_dir / filename
            
            def _write():
                with open(file_path, "wb") as f:
                    f.write(data)

            await asyncio.to_thread(_write)
            logger.info(f"Saved audio locally: {file_path}")
            return f"/api/v1/media/audio/{filename}"
        except Exception as e:
            logger.error(f"Failed saving audio locally to {filename}: {e}")
            return None

storage_service = StorageService()
