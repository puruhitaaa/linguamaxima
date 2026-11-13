"""
High-Speed Kaikki Wiktionary & FrequencyWords Bulk Ingest Pipeline.
Ingests thousands of verified dictionary words with POS, CEFR frequency ranking,
IPA phonetics, grammatical gender, definitions, and usage examples across ALL languages.
"""

import asyncio
import gzip
import json
import logging
import sys
import urllib.request

from sqlalchemy import select

from app.core.database import get_session_maker
from app.models import CEFRLevel, Language, Word

# Ensure utf-8 stdout
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("linguamaxima.kaikki_ingest")

FREQUENCY_URLS = {
    "de": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt",
    "en": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt",
    "es": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt",
    "fr": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt",
    "it": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/it/it_50k.txt",
    "pt": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pt_br/pt_br_50k.txt",
    "nl": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/nl/nl_50k.txt",
    "ru": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ru/ru_50k.txt",
    "id": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/id/id_50k.txt",
    "ja": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ja/ja_50k.txt",
    "zh": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/zh/zh_50k.txt",
    "ko": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ko/ko_50k.txt",
    "ar": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ar/ar_50k.txt",
}

KAIKKI_URLS = {
    "de": "https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl.gz",
    "en": "https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl.gz",
    "es": "https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl.gz",
    "fr": "https://kaikki.org/dictionary/French/kaikki.org-dictionary-French.jsonl.gz",
    "it": "https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl.gz",
    "pt": "https://kaikki.org/dictionary/Portuguese/kaikki.org-dictionary-Portuguese.jsonl.gz",
    "nl": "https://kaikki.org/dictionary/Dutch/kaikki.org-dictionary-Dutch.jsonl.gz",
    "ru": "https://kaikki.org/dictionary/Russian/kaikki.org-dictionary-Russian.jsonl.gz",
    "id": "https://kaikki.org/dictionary/Indonesian/kaikki.org-dictionary-Indonesian.jsonl.gz",
    "ja": "https://kaikki.org/dictionary/Japanese/kaikki.org-dictionary-Japanese.jsonl.gz",
    "zh": "https://kaikki.org/dictionary/Chinese/kaikki.org-dictionary-Chinese.jsonl.gz",
    "ko": "https://kaikki.org/dictionary/Korean/kaikki.org-dictionary-Korean.jsonl.gz",
    "ar": "https://kaikki.org/dictionary/Arabic/kaikki.org-dictionary-Arabic.jsonl.gz",
}

_FRAMEWORK_LABELS: dict[str, tuple[str, str, str, str, str, str]] = {
    "jlpt": ("JLPT N5", "JLPT N4", "JLPT N3", "JLPT N2", "JLPT N1", "JLPT N1+"),
    "hsk": ("HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"),
    "bipa": ("BIPA 1", "BIPA 2", "BIPA 3", "BIPA 4", "BIPA 5", "BIPA 6"),
    "torfl": ("TORFL Basic", "TORFL Prelim", "TORFL 1", "TORFL 2", "TORFL 3", "TORFL 4"),
    "cefr": ("A1", "A2", "B1", "B2", "C1", "C2"),
}

_RANK_BANDS: tuple[tuple[int, CEFRLevel, int], ...] = (
    (1000, CEFRLevel.A1, 0),
    (3000, CEFRLevel.A2, 1),
    (7000, CEFRLevel.B1, 2),
    (15000, CEFRLevel.B2, 3),
    (30000, CEFRLevel.C1, 4),
)


def rank_to_cefr(rank: int, framework: str = "cefr") -> tuple[CEFRLevel, str]:
    labels = _FRAMEWORK_LABELS.get(framework, _FRAMEWORK_LABELS["cefr"])
    for max_rank, cefr_level, idx in _RANK_BANDS:
        if rank <= max_rank:
            return cefr_level, labels[idx]
    return CEFRLevel.C2, labels[5]

def fetch_frequency_map(lang_code: str) -> dict[str, int]:
    url = FREQUENCY_URLS.get(lang_code)
    if not url:
        return {}
    logger.info(f"Downloading frequency list for '{lang_code}' from {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    freq_map = {}
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            lines = resp.read().decode("utf-8", errors="ignore").splitlines()
            for idx, line in enumerate(lines, start=1):
                parts = line.strip().split()
                if parts:
                    word = parts[0].strip()
                    freq_map[word.lower()] = idx
    except Exception as e:
        logger.warning(f"Could not load frequency map for {lang_code}: {e}")
    logger.info(f"Loaded {len(freq_map)} frequency entries for '{lang_code}'.")
    return freq_map

async def ingest_kaikki_language(lang_code: str = "de", target_count: int = 1500) -> None:
    session_maker = get_session_maker()
    freq_map = fetch_frequency_map(lang_code)

    url = KAIKKI_URLS.get(lang_code)
    if not url:
        logger.error(f"No Kaikki dataset URL configured for {lang_code}")
        return

    logger.info(f"Streaming Kaikki {lang_code.upper()} dictionary from {url} (target: {target_count} words)...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

    words_batch = []
    seen_keys = set()
    total_inserted = 0

    async with session_maker() as session:
        # Get language ID & framework
        lang_res = await session.execute(select(Language).where(Language.code == lang_code))
        lang = lang_res.scalar_one_or_none()
        if not lang:
            logger.error(f"Language {lang_code} not found in database!")
            return

        framework = lang.proficiency_framework or "cefr"

        # Pre-fetch existing lemmas
        existing_res = await session.execute(select(Word.lemma, Word.part_of_speech).where(Word.language_id == lang.id))
        for row in existing_res.all():
            seen_keys.add((row[0].strip().lower(), row[1].strip().lower()))

        logger.info(f"Language {lang_code} currently has {len(seen_keys)} existing entries.")

        with urllib.request.urlopen(req, timeout=120) as resp:
            with gzip.GzipFile(fileobj=resp) as gz:
                for line in gz:
                    if not line.strip():
                        continue
                    try:
                        entry = json.loads(line)
                    except Exception:
                        continue

                    lemma = entry.get("word")
                    pos = entry.get("pos")
                    if not lemma or not pos or len(lemma) < 1:
                        continue

                    pos_lower = pos.lower()
                    if pos_lower in ("noun", "name"):
                        pos_std = "noun"
                    elif pos_lower == "verb":
                        pos_std = "verb"
                    elif pos_lower in ("adj", "adjective"):
                        pos_std = "adjective"
                    elif pos_lower in ("adv", "adverb"):
                        pos_std = "adverb"
                    elif pos_lower in ("conj", "conjunction"):
                        pos_std = "conjunction"
                    elif pos_lower in ("prep", "preposition"):
                        pos_std = "preposition"
                    elif pos_lower in ("phrase", "idiom"):
                        pos_std = "phrase"
                    else:
                        pos_std = pos_lower

                    key = (lemma.lower(), pos_std)
                    if key in seen_keys:
                        continue

                    senses = entry.get("senses", [])
                    glosses = []
                    examples = []
                    for s in senses:
                        for g in s.get("glosses", []):
                            if g and not g.startswith("inflection of") and not g.startswith("plural of") and not g.startswith("feminine singular of"):
                                glosses.append(g)
                        for ex in s.get("examples", []):
                            if isinstance(ex, dict) and ex.get("text"):
                                examples.append((ex.get("text"), ex.get("translation")))

                    if not glosses:
                        continue

                    seen_keys.add(key)

                    ipa = None
                    for snd in entry.get("sounds", []):
                        if "ipa" in snd:
                            ipa = snd["ipa"]
                            break

                    gender = None
                    tags = entry.get("tags", [])
                    if pos_std == "noun":
                        if "masculine" in tags:
                            gender = "der" if lang_code == "de" else "el"
                        elif "feminine" in tags:
                            gender = "die" if lang_code == "de" else "la"
                        elif "neuter" in tags:
                            gender = "das"

                    rank = freq_map.get(lemma.lower(), 99999)
                    norm_level, native_lvl = rank_to_cefr(rank, framework)

                    translation = glosses[0] if glosses else lemma
                    definition = "; ".join(glosses[:2])

                    example_sentence = None
                    example_translation = None
                    if examples:
                        example_sentence, example_translation = examples[0]

                    word_obj = Word(
                        language_id=lang.id,
                        lemma=lemma,
                        normalized_level=norm_level,
                        native_level=native_lvl,
                        part_of_speech=pos_std,
                        gender=gender,
                        phonetic=ipa,
                        translation=translation,
                        definition=definition,
                        example_sentence=example_sentence,
                        example_translation=example_translation,
                        frequency_rank=rank if rank != 99999 else None,
                    )
                    words_batch.append(word_obj)

                    if len(words_batch) >= 200:
                        session.add_all(words_batch)
                        await session.commit()
                        total_inserted += len(words_batch)
                        logger.info(f"[{lang_code.upper()}] Ingested {total_inserted} / {target_count} words into Neon DB...")
                        words_batch = []

                        if total_inserted >= target_count:
                            break

                if words_batch:
                    session.add_all(words_batch)
                    await session.commit()
                    total_inserted += len(words_batch)

    logger.info(f"Successfully finished ingesting {total_inserted} words for '{lang_code}' into Neon Database!")

if __name__ == "__main__":
    lang = "de"
    target = 1500
    if len(sys.argv) > 1:
        lang = sys.argv[1]
    if len(sys.argv) > 2:
        target = int(sys.argv[2])
    asyncio.run(ingest_kaikki_language(lang, target))
