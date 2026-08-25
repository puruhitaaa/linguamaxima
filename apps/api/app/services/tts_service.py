import asyncio
import hashlib
import logging
import re
from typing import Dict, List, Optional, Tuple
import edge_tts
from app.core.config import settings
from app.services.storage_service import storage_service

logger = logging.getLogger("linguamaxima.tts")

# Multi-voice mapping per language code, separated by male and female actor pools
LANGUAGE_VOICE_POOLS: Dict[str, Dict[str, List[str]]] = {
    "de": {
        "female": ["de-DE-KatjaNeural", "de-DE-AmalaNeural", "de-DE-LouisaNeural", "de-DE-MajaNeural"],
        "male": ["de-DE-KillianNeural", "de-DE-ConradNeural", "de-DE-ChristophNeural", "de-DE-KlausNeural"],
    },
    "id": {
        "female": ["id-ID-GadisNeural"],
        "male": ["id-ID-ArdiNeural"],
    },
    "en": {
        "female": ["en-US-JennyNeural", "en-US-AriaNeural", "en-US-EmmaNeural", "en-US-AvaNeural"],
        "male": ["en-US-ChristopherNeural", "en-US-GuyNeural", "en-US-AndrewNeural", "en-US-BrianNeural"],
    },
    "es": {
        "female": ["es-ES-ElviraNeural", "es-ES-AbrilNeural", "es-ES-EstrellaNeural", "es-ES-IreneNeural"],
        "male": ["es-ES-AlvaroNeural", "es-ES-ArnauNeural", "es-ES-DarioNeural", "es-ES-SaulNeural"],
    },
    "fr": {
        "female": ["fr-FR-DeniseNeural", "fr-FR-EloiseNeural", "fr-FR-BrigitteNeural", "fr-FR-CelesteNeural"],
        "male": ["fr-FR-HenriNeural", "fr-FR-AlainNeural", "fr-FR-ClaudeNeural", "fr-FR-MauriceNeural"],
    },
    "it": {
        "female": ["it-IT-ElsaNeural", "it-IT-IsabellaNeural", "it-IT-FabiolaNeural", "it-IT-FiammaNeural"],
        "male": ["it-IT-DiegoNeural", "it-IT-BenignoNeural", "it-IT-CataldoNeural", "it-IT-GianniNeural"],
    },
    "ja": {
        "female": ["ja-JP-NanamiNeural", "ja-JP-AoiNeural", "ja-JP-MayuNeural", "ja-JP-ShioriNeural"],
        "male": ["ja-JP-KeitaNeural", "ja-JP-DaichiNeural", "ja-JP-NaokiNeural"],
    },
    "zh": {
        "female": ["zh-CN-XiaoxiaoNeural", "zh-CN-XiaoyiNeural"],
        "male": ["zh-CN-YunxiNeural", "zh-CN-YunjianNeural", "zh-CN-YunyangNeural"],
    },
    "ko": {
        "female": ["ko-KR-SunHiNeural"],
        "male": ["ko-KR-InJoonNeural"],
    },
    "pt": {
        "female": ["pt-BR-FranciscaNeural"],
        "male": ["pt-BR-AntonioNeural"],
    },
    "nl": {
        "female": ["nl-NL-FennaNeural"],
        "male": ["nl-NL-MaartenNeural"],
    },
    "ru": {
        "female": ["ru-RU-SvetlanaNeural"],
        "male": ["ru-RU-DmitryNeural"],
    },
    "ar": {
        "female": ["ar-SA-ZariyahNeural"],
        "male": ["ar-SA-HamedNeural"],
    },
    "tr": {
        "female": ["tr-TR-EmelNeural"],
        "male": ["tr-TR-AhmetNeural"],
    },
    "pl": {
        "female": ["pl-PL-ZofiaNeural"],
        "male": ["pl-PL-MarekNeural"],
    },
    "sv": {
        "female": ["sv-SE-SofieNeural"],
        "male": ["sv-SE-MattiasNeural"],
    },
}

SPEAKER_LINE_REGEX = re.compile(r"^([^\n\r:]{1,40}):\s*(.+)$", re.DOTALL)

# Common names and gender cues for accurate voice actor matching
FEMALE_NAMES = {
    "anna", "anne", "hannah", "sarah", "sara", "sophia", "sophie", "emma", "mia", "emily",
    "laura", "lisa", "julia", "elena", "maria", "marie", "clara", "eva", "leah", "lea",
    "charlotte", "luisa", "louisa", "maja", "maya", "lena", "paula", "greta", "amelie",
    "frieda", "johanna", "mathilda", "claudia", "monika", "petra", "katja", "susanne", "brigitte",
    "elvira", "isabella", "lucia", "carmen", "rosa", "lucie", "juliette", "camille",
    "alice", "helen", "mary", "jessica", "ashley", "amanda", "olivia", "ava", "chloe", "zoe",
    "nanami", "aoi", "mayu", "sakura", "yuki", "hana", "xiaoxiao", "xiaoyi", "sunhi",
    "gadis", "siti", "dewi", "putri", "ani", "rina", "ratna", "wulandari", "tania",
    "frau", "mrs", "ms", "miss", "madame", "mademoiselle", "señora", "senora", "señorita",
    "mutter", "mother", "maman", "madre", "ibu", "tochter", "daughter", "fille", "hija",
    "kellnerin", "waitress", "serveuse", "camarera", "pelayan wanita", "dame", "lady", "girl", "mädchen",
}

MALE_NAMES = {
    "leo", "leon", "lukas", "lucas", "paul", "max", "felix", "elias", "jonas", "noah",
    "ben", "finn", "luca", "tim", "jan", "niklas", "david", "michael", "alexander", "moritz",
    "sebastian", "florian", "tobias", "christoph", "klaus", "bernd", "karl", "hans", "stefan",
    "carlos", "alvaro", "diego", "javier", "mateo", "antonio", "miguel", "pablo", "juan",
    "henri", "louis", "pierre", "alain", "thomas", "julien", "antoine", "nicolas", "alexandre",
    "oliver", "john", "james", "william", "robert", "george", "charles", "edward", "harry", "jack",
    "keita", "daichi", "naoki", "kenji", "taro", "yunxi", "yunjian", "yunyang", "injoon",
    "ardi", "budi", "agus", "joko", "eko", "bambang", "hendra", "rizky", "bayu",
    "herr", "mr", "sir", "monsieur", "señor", "senor", "vater", "father", "père", "pere", "padre", "bapak",
    "sohn", "son", "fils", "hijo", "kellner", "waiter", "serveur", "camarero", "pelayan pria",
    "mann", "man", "homme", "hombre", "pria", "junge", "boy", "garçon", "garcon", "chico",
}


def detect_speaker_gender(name: str) -> str:
    """
    Detects if a character name is female, male, or unknown.
    Uses exact lookup followed by linguistic morphological heuristics.
    """
    clean_name = name.strip().lower()
    # Remove leading titles/particles
    clean_name = re.sub(r"^(herr|frau|mr\.|mrs\.|ms\.|dr\.)\s+", "", clean_name)

    if clean_name in FEMALE_NAMES:
        return "female"
    if clean_name in MALE_NAMES:
        return "male"

    # Multi-word names: check first word
    first_token = clean_name.split()[0]
    if first_token in FEMALE_NAMES:
        return "female"
    if first_token in MALE_NAMES:
        return "male"

    # Morphological heuristics
    if clean_name.endswith(("in", "ine", "ette", "ia", "ie", "elle")) and clean_name not in {"ben", "robin", "kevin", "martin"}:
        return "female"
    if clean_name.endswith("a") and clean_name not in {"luca", "noah", "joshua", "elias", "akira"}:
        return "female"
    if clean_name.endswith(("o", "us", "er", "or", "ik", "el", "an", "on")):
        return "male"

    return "unknown"


class TTSService:
    def _get_filename(self, text: str, voice: str) -> str:
        # Create stable hash for audio file caching
        content_hash = hashlib.sha256(f"{voice}:{text}".encode("utf-8")).hexdigest()[:16]
        return f"{content_hash}.mp3"

    def get_voice_pools_for_language(self, language: str) -> Dict[str, List[str]]:
        lang_code = language.lower().split("-")[0].split("_")[0]
        return LANGUAGE_VOICE_POOLS.get(lang_code, LANGUAGE_VOICE_POOLS["de"])

    def get_voice_for_language(self, language: str) -> str:
        pools = self.get_voice_pools_for_language(language)
        male_voices = pools.get("male", [])
        if male_voices:
            return male_voices[0]
        female_voices = pools.get("female", [])
        if female_voices:
            return female_voices[0]
        return settings.default_target_voice or "de-DE-KillianNeural"

    def parse_dialogue_turns(self, text: str) -> List[Tuple[str, str]]:
        """
        Parses text paragraphs into speaker dialogue turns.
        Returns a list of (speaker_name, dialogue_text) tuples.
        If a paragraph has no speaker prefix, speaker is an empty string "".
        """
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        turns: List[Tuple[str, str]] = []
        for p in paragraphs:
            match = SPEAKER_LINE_REGEX.match(p)
            if match:
                speaker = match.group(1).strip()
                dialogue = match.group(2).strip()
                turns.append((speaker, dialogue))
            else:
                turns.append(("", p))
        return turns

    def assign_voices_to_speakers(
        self, unique_speakers: List[str], language: str
    ) -> Dict[str, str]:
        """
        Assigns accurate male / female neural voices to speakers based on character names.
        """
        pools = self.get_voice_pools_for_language(language)
        female_voices = pools.get("female", ["de-DE-KatjaNeural"])
        male_voices = pools.get("male", ["de-DE-KillianNeural"])

        female_idx = 0
        male_idx = 0
        speaker_voice_map: Dict[str, str] = {}

        for spk in unique_speakers:
            gender = detect_speaker_gender(spk)
            if gender == "female":
                assigned = female_voices[female_idx % len(female_voices)]
                female_idx += 1
            elif gender == "male":
                assigned = male_voices[male_idx % len(male_voices)]
                male_idx += 1
            else:
                # If gender is unknown, balance male and female allocations
                if female_idx <= male_idx:
                    assigned = female_voices[female_idx % len(female_voices)]
                    female_idx += 1
                else:
                    assigned = male_voices[male_idx % len(male_voices)]
                    male_idx += 1

            speaker_voice_map[spk] = assigned

        return speaker_voice_map

    async def _synthesize_bytes(self, text: str, voice: str) -> Optional[bytes]:
        """Synthesize raw audio stream for text using edge-tts."""
        try:
            communicate = edge_tts.Communicate(text.strip(), voice)
            audio_chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_chunks.append(chunk["data"])
            audio_data = b"".join(audio_chunks)
            return audio_data if audio_data else None
        except Exception as e:
            logger.error(f"TTS synthesis failed for text '{text[:30]}...' with voice {voice}: {e}")
            return None

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
        audio_data = await self._synthesize_bytes(text.strip(), voice)
        if not audio_data:
            return None

        # 3. Upload/save via storage service
        uploaded_url = await storage_service.upload_audio(filename, audio_data)
        logger.info(f"Synthesized TTS audio: {filename} ({len(audio_data)} bytes) -> {uploaded_url}")
        return uploaded_url

    async def generate_story_audio(
        self,
        text: str,
        language: str = "de"
    ) -> Optional[str]:
        """
        Generates multi-voice audio if story contains a multi-character dialogue,
        or single narrator voice audio if it is a monologue.
        """
        if not text or not text.strip():
            return None

        turns = self.parse_dialogue_turns(text)
        speakers = [speaker for speaker, _ in turns if speaker]
        unique_speakers = list(dict.fromkeys(speakers))

        # If 2 or more distinct characters are speaking, generate multi-voice audio
        if len(unique_speakers) >= 2:
            speaker_voice_map = self.assign_voices_to_speakers(unique_speakers, language)
            default_voice = self.get_voice_for_language(language)

            logger.info(
                f"Synthesizing gender-matched multi-actor dialogue for language '{language}' with {len(unique_speakers)} actors: {speaker_voice_map}"
            )

            # Generate composite hash key for caching
            composite_key = "|".join(
                f"{speaker_voice_map.get(spk, default_voice)}:{line}"
                for spk, line in turns
            )
            filename = f"dialogue_{hashlib.sha256(composite_key.encode('utf-8')).hexdigest()[:16]}.mp3"

            existing_url = await storage_service.audio_exists(filename)
            if existing_url:
                return existing_url

            # Synthesize each turn with assigned actor's voice
            turn_audio_segments: List[bytes] = []
            for spk, line in turns:
                voice = speaker_voice_map.get(spk, default_voice)
                audio_bytes = await self._synthesize_bytes(line, voice)
                if audio_bytes:
                    turn_audio_segments.append(audio_bytes)

            if not turn_audio_segments:
                logger.error("Failed to generate any audio segments for multi-character dialogue")
                return None

            combined_audio = b"".join(turn_audio_segments)
            uploaded_url = await storage_service.upload_audio(filename, combined_audio)
            logger.info(
                f"Synthesized multi-actor dialogue audio: {filename} ({len(combined_audio)} bytes) -> {uploaded_url}"
            )
            return uploaded_url

        # Monologue or single speaker: use standard generation
        return await self.generate_audio(text=text, language=language)


tts_service = TTSService()
