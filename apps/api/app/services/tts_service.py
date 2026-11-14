import hashlib
import logging
import re
import unicodedata

import edge_tts

from app.core.config import settings
from app.services.storage_service import storage_service

logger = logging.getLogger("linguamaxima.tts")

# Multi-voice mapping per language code, separated by male and female actor pools
LANGUAGE_VOICE_POOLS: dict[str, dict[str, list[str]]] = {
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

SPEAKER_LINE_REGEX = re.compile(r"^\s*(?:[-*•]\s+|\d+\.\s+)?([^\n\r:：]{1,50})[:：]\s*(.+)$")

FEMALE_TITLES = {
    "frau", "fraulein", "fräulein", "mrs", "ms", "miss", "madam", "madame", "mme",
    "mademoiselle", "mlle", "senora", "señora", "sra", "senorita", "señorita", "srta",
    "signora", "signorina", "ibu", "nyonya", "nona", "mbak",
}
MALE_TITLES = {
    "herr", "mr", "sir", "monsieur", "senor", "señor", "sr", "signore", "signor",
    "bapak", "pak", "mas",
}

# Common names and gender cues for accurate voice actor matching
FEMALE_NAMES = {
    "anna", "anne", "hannah", "sarah", "sara", "sophia", "sophie", "sofia", "emma", "mia", "emily",
    "laura", "lisa", "julia", "elena", "maria", "marie", "clara", "klara", "eva", "leah", "lea",
    "charlotte", "luisa", "louisa", "maja", "maya", "lena", "paula", "greta", "amelie",
    "frieda", "johanna", "mathilda", "claudia", "monika", "petra", "katja", "susanne", "brigitte",
    "ingrid", "astrid", "sigrid", "birgit", "dagmar", "heike", "silke", "anke", "ulrike", "sabine",
    "katrin", "kathrin", "kerstin", "kristin", "carolin", "karolin", "jasmin", "yasmin", "marion",
    "nadine", "veronika", "franziska", "theresa", "miriam", "esther", "ruth", "naomi", "elise",
    "elvira", "isabella", "lucia", "carmen", "rosa", "lucie", "juliette", "camille", "celine",
    "agnes", "noemie", "cecile", "valerie", "helene", "denise", "maelle", "ines",
    "alice", "helen", "mary", "jessica", "ashley", "amanda", "olivia", "ava", "chloe", "zoe",
    "claire", "rachel", "elizabeth", "grace", "lucy", "victoria", "natalie", "jennifer", "rebecca",
    "katherine", "catherine", "margaret", "susan", "karen", "sharon", "heather", "stephanie",
    "melanie", "nicole", "simone", "yvonne", "elaine", "diane", "lauren", "megan", "abigail",
    "nanami", "aoi", "mayu", "sakura", "yuki", "hana", "ayumi", "haruka", "yui", "misaki",
    "xiaoxiao", "xiaoyi", "mei", "ling", "sunhi", "yuna", "mina", "jiyeon", "soeun",
    "gadis", "siti", "dewi", "putri", "ani", "rina", "ratna", "wulandari", "tania", "ayu",
    "lestari", "nurul", "indah", "kartika", "fatima", "aisha", "layla", "noor", "amira", "zainab",
    "frau", "mrs", "ms", "miss", "madame", "mademoiselle", "senora", "senorita",
    "mutter", "mother", "mom", "mum", "maman", "madre", "ibu", "tochter", "daughter", "fille", "hija",
    "schwester", "sister", "tante", "aunt", "oma", "grandma", "grossmutter", "wife", "woman",
    "kellnerin", "waitress", "serveuse", "camarera", "pelayan wanita", "dame", "lady", "girl", "madchen",
    "kundin", "verkauferin", "lehrerin", "arztin", "rezeptionistin", "mitarbeiterin", "nachbarin",
    "freundin", "kollegin", "schulerin", "studentin", "patientin", "besucherin", "gastin",
    "chefin", "assistentin", "apothekerin", "backerin", "kassiererin", "kochin",
}

MALE_NAMES = {
    "leo", "leon", "darren", "damon", "daniel", "david", "derek", "arthur", "aaron", "liam", "ethan",
    "lukas", "lucas", "paul", "max", "felix", "elias", "jonas", "noah",
    "ben", "finn", "luca", "tim", "jan", "niklas", "michael", "alexander", "moritz",
    "sebastian", "florian", "tobias", "christoph", "klaus", "bernd", "karl", "hans", "stefan",
    "andreas", "matthias", "philipp", "peter", "jens", "frank", "marc", "mark", "dirk", "ralf",
    "ralph", "uwe", "holger", "jorg", "jurgen", "dieter", "helmut", "wolfgang", "manfred", "heinz",
    "franz", "fritz", "otto", "oskar", "oscar", "erik", "eric", "patrick", "hendrik", "frederik",
    "olaf", "sven", "nils", "lars", "ole", "jakob", "jacob", "emil", "anton", "benjamin", "julian",
    "adrian", "fabian", "christian", "kevin", "robin", "dennis", "dominik", "yannick", "henrik",
    "bjorn", "soren", "gunther", "martin",
    "carlos", "alvaro", "diego", "javier", "mateo", "antonio", "miguel", "pablo", "juan",
    "jose", "andres", "tomas", "nicolas",
    "henri", "louis", "pierre", "alain", "thomas", "julien", "antoine", "alexandre", "rene",
    "oliver", "john", "james", "william", "robert", "george", "charles", "edward", "harry", "jack",
    "keita", "daichi", "naoki", "kenji", "taro", "ken", "hiroshi", "takeshi", "haruto", "ren", "sota",
    "yunxi", "yunjian", "yunyang", "wei", "ming", "hao", "injoon", "minho", "jihoon", "jun",
    "ardi", "budi", "agus", "joko", "eko", "bambang", "hendra", "rizky", "bayu", "andi", "reza",
    "dimas", "fajar", "bagus", "wahyu", "ilham", "putra", "pratama",
    "omar", "ali", "hassan", "ahmed", "mohammad", "yusuf", "ibrahim", "tariq",
    "herr", "mr", "sir", "monsieur", "senor", "vater", "father", "pere", "padre", "bapak",
    "sohn", "son", "fils", "hijo", "bruder", "brother", "onkel", "uncle", "opa", "grossvater",
    "kellner", "waiter", "serveur", "camarero", "pelayan pria", "mann", "man", "homme", "hombre",
    "pria", "junge", "boy", "garcon", "chico", "ehemann", "husband",
    "verkaufer", "arzt", "apotheker", "polizist", "schaffner", "koch", "lehrer", "mitarbeiter",
    "nachbar", "freund", "kollege", "schuler", "student", "patient", "chef", "assistent",
    "kassierer", "rezeptionist", "backer",
}

FIRST_PERSON_INTRO_PATTERNS = [
    re.compile(r"(?:ich heiße|mein name ist|ich bin)\s+([A-Za-zÄÖÜäöüß]+)", re.IGNORECASE),
    re.compile(r"(?:i am|i'm|my name is)\s+([A-Za-z]+)", re.IGNORECASE),
    re.compile(r"(?:me llamo|mi nombre es|soy)\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)", re.IGNORECASE),
    re.compile(r"(?:je m'appelle|mon nom est|je suis)\s+([A-Za-zÀ-ÿ]+)", re.IGNORECASE),
    re.compile(r"(?:mi chiamo|il mio nome è|sono)\s+([A-Za-zÀ-ÿ]+)", re.IGNORECASE),
    re.compile(r"(?:nama saya|namaku|aku|saya)\s+([A-Za-z]+)", re.IGNORECASE),
]


def _fold_accents(value: str) -> str:
    """Folds Unicode accents/diacritics to plain ASCII equivalents for name matching."""
    decomposed = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def _clean_speaker_label(name: str) -> str:
    """Strips markdown formatting and list markers from a speaker prefix."""
    cleaned = name.strip()
    cleaned = re.sub(r"^(?:[-*•]\s+|\d+\.\s+)", "", cleaned)
    cleaned = cleaned.strip("*_`[]()\"' ")
    return re.sub(r"\s+", " ", cleaned)


def detect_speaker_gender(name: str) -> str:
    """
    Detects if a character name is female, male, or unknown.
    Checks gendered titles first, then exact/token lookups (with accent folding),
    followed by linguistic morphological heuristics.
    """
    cleaned = _clean_speaker_label(name).lower()
    if not cleaned:
        return "unknown"

    folded = _fold_accents(cleaned)
    tokens = [tok.strip(".,;:!?()[]{}\"'") for tok in re.split(r"[\s\-_/]+", folded) if tok.strip(".,;:!?()[]{}\"'")]
    if not tokens:
        return "unknown"

    # Check explicit gendered titles before stripping honorifics (e.g. "Frau Weber" -> female)
    for tok in tokens:
        if tok in FEMALE_TITLES:
            return "female"
        if tok in MALE_TITLES:
            return "male"

    # Strip non-gendered academic/professional honorifics
    remaining = [tok for tok in tokens if tok not in {"dr", "prof", "professor"}] or tokens
    joined = " ".join(remaining)

    if joined in FEMALE_NAMES:
        return "female"
    if joined in MALE_NAMES:
        return "male"

    for tok in remaining:
        if tok in FEMALE_NAMES:
            return "female"
        if tok in MALE_NAMES:
            return "male"

    # Morphological heuristics on primary token
    primary = remaining[0]
    if primary.endswith(("in", "ine", "ette", "ia", "ie", "elle")) and primary not in {"ben", "robin", "kevin", "martin"}:
        return "female"
    if primary.endswith("a") and primary not in {"luca", "noah", "joshua", "elias", "akira"}:
        return "female"
    if primary.endswith(("o", "us", "er", "or", "ik", "el", "an", "on")):
        return "male"

    return "unknown"


def detect_speaker_gender_from_content(text: str) -> str:
    """
    Scans narrative monologue text for self-introduction patterns to infer speaker gender.
    """
    if not text:
        return "unknown"
    for pattern in FIRST_PERSON_INTRO_PATTERNS:
        match = pattern.search(text)
        if match:
            candidate_name = match.group(1).strip()
            gender = detect_speaker_gender(candidate_name)
            if gender != "unknown":
                return gender
    return "unknown"


class TTSService:
    def _get_filename(self, text: str, voice: str) -> str:
        # Create stable hash for audio file caching
        content_hash = hashlib.sha256(f"{voice}:{text}".encode()).hexdigest()[:16]
        return f"{content_hash}.mp3"

    def get_voice_pools_for_language(self, language: str) -> dict[str, list[str]]:
        lang_code = language.lower().split("-")[0].split("_")[0]
        return LANGUAGE_VOICE_POOLS.get(lang_code, LANGUAGE_VOICE_POOLS["de"])

    def get_voice_for_language(self, language: str, gender: str | None = None) -> str:
        pools = self.get_voice_pools_for_language(language)
        if gender == "female":
            female_voices = pools.get("female", [])
            if female_voices:
                return female_voices[0]
        elif gender == "male":
            male_voices = pools.get("male", [])
            if male_voices:
                return male_voices[0]

        # Default fallback: prefer male then female
        male_voices = pools.get("male", [])
        if male_voices:
            return male_voices[0]
        female_voices = pools.get("female", [])
        if female_voices:
            return female_voices[0]
        return settings.default_target_voice or "de-DE-KillianNeural"

    def parse_dialogue_turns(self, text: str) -> list[tuple[str, str]]:
        """
        Parses text paragraphs/lines into speaker dialogue turns.
        Supports both blank-line-separated and single-newline dialogue turns,
        as well as markdown bold/list formatting around speaker names.
        Returns a list of (speaker_name, dialogue_text) tuples.
        """
        turns: list[tuple[str, str]] = []
        paragraphs = [p.strip() for p in re.split(r"\r?\n\s*\r?\n", text.strip()) if p.strip()]
        for p in paragraphs:
            lines = [ln.strip() for ln in p.splitlines() if ln.strip()]
            current_speaker = ""
            current_lines: list[str] = []

            for line in lines:
                match = SPEAKER_LINE_REGEX.match(line)
                candidate_speaker = _clean_speaker_label(match.group(1)) if match else ""
                candidate_dialogue = re.sub(r"^\*+\s*", "", match.group(2).strip()).strip() if match else ""

                is_valid_speaker = (
                    bool(match)
                    and bool(candidate_speaker)
                    and not candidate_speaker.isdigit()
                    and not candidate_dialogue.startswith("//")
                )
                if is_valid_speaker:
                    if current_lines:
                        turns.append((current_speaker, " ".join(current_lines)))
                    current_speaker = candidate_speaker
                    current_lines = [candidate_dialogue] if candidate_dialogue else []
                else:
                    current_lines.append(line)

            if current_lines:
                turns.append((current_speaker, " ".join(current_lines)))
        return turns

    @staticmethod
    def _lookup_explicit_gender(
        speaker: str,
        speaker_genders: dict[str, str] | None,
    ) -> str:
        if not speaker_genders:
            return "unknown"
        cleaned_target = _clean_speaker_label(speaker).lower()
        for raw_key, raw_gender in speaker_genders.items():
            if not raw_key or not raw_gender:
                continue
            cleaned_key = _clean_speaker_label(raw_key).lower()
            if cleaned_key == cleaned_target or raw_key.strip().lower() == speaker.strip().lower():
                normalized_gender = raw_gender.strip().lower()
                if normalized_gender in ("male", "female"):
                    return normalized_gender
        return "unknown"

    def assign_voices_to_speakers(
        self,
        unique_speakers: list[str],
        language: str,
        speaker_genders: dict[str, str] | None = None,
    ) -> dict[str, str]:
        """
        Assigns accurate male / female neural voices to speakers.
        Uses explicit LLM-supplied speaker genders first, then name/title detection,
        and balances any remaining unknown speakers across genders in a second pass.
        """
        pools = self.get_voice_pools_for_language(language)
        female_voices = pools.get("female", ["de-DE-KatjaNeural"])
        male_voices = pools.get("male", ["de-DE-KillianNeural"])

        female_idx = 0
        male_idx = 0
        speaker_voice_map: dict[str, str] = {}
        unknown_speakers: list[str] = []

        # Pass 1: Assign speakers with known or explicitly provided gender first
        for spk in unique_speakers:
            gender = self._lookup_explicit_gender(spk, speaker_genders)
            if gender == "unknown":
                gender = detect_speaker_gender(spk)

            if gender == "female":
                speaker_voice_map[spk] = female_voices[female_idx % len(female_voices)]
                female_idx += 1
            elif gender == "male":
                speaker_voice_map[spk] = male_voices[male_idx % len(male_voices)]
                male_idx += 1
            else:
                unknown_speakers.append(spk)

        # Pass 2: Balance remaining unknown speakers against already-assigned genders
        for spk in unknown_speakers:
            if female_idx <= male_idx:
                speaker_voice_map[spk] = female_voices[female_idx % len(female_voices)]
                female_idx += 1
            else:
                speaker_voice_map[spk] = male_voices[male_idx % len(male_voices)]
                male_idx += 1

        return speaker_voice_map

    async def _synthesize_bytes(self, text: str, voice: str) -> bytes | None:
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
        voice: str | None = None,
        language: str = "de"
    ) -> str | None:
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
        language: str = "de",
        speaker_gender: str | None = None,
        speaker_name: str | None = None,
        speaker_genders: dict[str, str] | None = None,
    ) -> str | None:
        """
        Generates multi-voice audio if story contains a multi-character dialogue,
        or gender-matched narrator voice audio if it is a monologue/solo reflection.
        """
        if not text or not text.strip():
            return None

        turns = self.parse_dialogue_turns(text)
        speakers = [speaker for speaker, _ in turns if speaker]
        unique_speakers = list(dict.fromkeys(speakers))

        # If 2 or more distinct characters are speaking, generate multi-voice audio
        if len(unique_speakers) >= 2:
            speaker_voice_map = self.assign_voices_to_speakers(
                unique_speakers,
                language,
                speaker_genders=speaker_genders,
            )
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
            turn_audio_segments: list[bytes] = []
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

        # Monologue or single speaker: determine effective speaker gender
        effective_gender: str | None = None

        if speaker_gender and speaker_gender.strip().lower() in ("male", "female"):
            effective_gender = speaker_gender.strip().lower()
        elif speaker_name:
            detected = detect_speaker_gender(speaker_name)
            if detected in ("male", "female"):
                effective_gender = detected
        elif len(unique_speakers) == 1:
            detected = detect_speaker_gender(unique_speakers[0])
            if detected in ("male", "female"):
                effective_gender = detected

        if not effective_gender or effective_gender == "unknown":
            detected = detect_speaker_gender_from_content(text)
            if detected in ("male", "female"):
                effective_gender = detected

        chosen_voice = self.get_voice_for_language(language, gender=effective_gender)
        logger.info(
            f"Synthesizing monologue audio for language '{language}' (gender={effective_gender}, speaker={speaker_name}) using voice '{chosen_voice}'"
        )
        return await self.generate_audio(text=text, voice=chosen_voice, language=language)


tts_service = TTSService()
