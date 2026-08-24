import asyncio
import hashlib
import logging
from pathlib import Path
from typing import Optional
import edge_tts
from app.core.config import settings

logger = logging.getLogger("linguamaxima.tts")

class TTSService:
    def __init__(self):
        self.audio_dir: Path = settings.audio_dir
        self.audio_dir.mkdir(parents=True, exist_ok=True)

    def _get_filename(self, text: str, voice: str) -> str:
        # Create stable hash for audio file caching
        content_hash = hashlib.sha256(f"{voice}:{text}".encode("utf-8")).hexdigest()[:16]
        return f"{content_hash}.mp3"

    async def generate_audio(
        self,
        text: str,
        voice: Optional[str] = None,
        language: str = "de"
    ) -> Optional[str]:
        """
        Generates TTS audio file for text using edge-tts.
        Returns relative URL path to the generated audio file or None on failure.
        """
        if not text or not text.strip():
            return None

        if voice is None:
            if language.startswith("de"):
                voice = settings.default_target_voice
            elif language.startswith("id"):
                voice = settings.default_origin_voice
            else:
                voice = settings.default_target_voice

        filename = self._get_filename(text.strip(), voice)
        file_path = self.audio_dir / filename
        relative_url = f"/api/v1/media/audio/{filename}"

        # If already exists and has content, return existing
        if file_path.exists() and file_path.stat().st_size > 0:
            return relative_url

        try:
            communicate = edge_tts.Communicate(text.strip(), voice)
            await communicate.save(str(file_path))
            logger.info(f"Generated TTS audio: {filename} for voice {voice}")
            return relative_url
        except Exception as e:
            logger.error(f"TTS generation failed for text '{text[:30]}...' with voice {voice}: {e}")
            return None

tts_service = TTSService()
