import asyncio
import hashlib
import logging
from typing import Optional
import edge_tts
from app.core.config import settings
from app.services.storage_service import storage_service

logger = logging.getLogger("linguamaxima.tts")

VOICE_MAP = {
    "de": "de-DE-KillianNeural",
    "id": "id-ID-ArdiNeural",
    "en": "en-US-ChristopherNeural",
    "es": "es-ES-AlvaroNeural",
    "fr": "fr-FR-HenriNeural",
    "it": "it-IT-DiegoNeural",
    "ja": "ja-JP-KeitaNeural",
    "zh": "zh-CN-YunxiNeural",
    "ko": "ko-KR-InJoonNeural",
    "pt": "pt-BR-AntonioNeural",
    "nl": "nl-NL-MaartenNeural",
    "ru": "ru-RU-DmitryNeural",
    "ar": "ar-SA-HamedNeural",
}

class TTSService:
    def _get_filename(self, text: str, voice: str) -> str:
        # Create stable hash for audio file caching
        content_hash = hashlib.sha256(f"{voice}:{text}".encode("utf-8")).hexdigest()[:16]
        return f"{content_hash}.mp3"

    def get_voice_for_language(self, language: str) -> str:
        lang_code = language.lower().split("-")[0].split("_")[0]
        return VOICE_MAP.get(lang_code, settings.default_target_voice or "de-DE-KillianNeural")

    async def generate_audio(
        self,
        text: str,
        voice: Optional[str] = None,
        language: str = "de"
    ) -> Optional[str]:
        """
        Generates TTS audio for text using edge-tts.
        Persists using storage_service (local filesystem or Cloudflare R2).
        Returns accessible public or relative URL path.
        """
        if not text or not text.strip():
            return None

        if voice is None:
            voice = self.get_voice_for_language(language)

        filename = self._get_filename(text.strip(), voice)

        # 1. Check if audio already exists in storage cache
        existing_url = await storage_service.audio_exists(filename)
        if existing_url:
            return existing_url

        # 2. Synthesize audio stream into memory
        try:
            communicate = edge_tts.Communicate(text.strip(), voice)
            audio_chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])

            audio_data = b"".join(audio_chunks)
            if not audio_data:
                logger.error(f"TTS generation returned empty audio data for '{text[:30]}...'")
                return None

            # 3. Upload/save via storage service
            uploaded_url = await storage_service.upload_audio(filename, audio_data)
            logger.info(f"Synthesized TTS audio: {filename} ({len(audio_data)} bytes) -> {uploaded_url}")
            return uploaded_url
        except Exception as e:
            logger.error(f"TTS generation failed for text '{text[:30]}...' with voice {voice}: {e}")
            return None

tts_service = TTSService()
