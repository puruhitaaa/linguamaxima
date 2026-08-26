"""
Recalculates CEFR / Native levels for all existing words based on verified frequency maps.
"""

import sys
import logging
import asyncio
from sqlalchemy import select, update
from app.models import CEFRLevel, Language, Word
from app.core.database import get_session_maker
from app.seeds.kaikki_bulk_ingest import fetch_frequency_map, rank_to_cefr

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("linguamaxima.recalc")

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
    "ja": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/ja/ja_50k.txt",
    "zh": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/zh_cn/zh_cn_50k.txt",
    "ko": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ko/ko_50k.txt",
    "ar": "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ar/ar_50k.txt",
}

async def recalculate_all_levels():
    session_maker = get_session_maker()

    async with session_maker() as session:
        langs = (await session.execute(select(Language))).scalars().all()

        for lang in langs:
            url = FREQUENCY_URLS.get(lang.code)
            if not url:
                continue

            freq_map = {}
            import urllib.request
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    lines = resp.read().decode("utf-8", errors="ignore").splitlines()
                    for idx, line in enumerate(lines, start=1):
                        parts = line.strip().split()
                        if parts:
                            freq_map[parts[0].strip().lower()] = idx
            except Exception as e:
                logger.warning(f"Failed to fetch frequency list for {lang.code}: {e}")
                continue

            words = (await session.execute(select(Word).where(Word.language_id == lang.id))).scalars().all()
            framework = lang.proficiency_framework or "cefr"

            updated_count = 0
            for w in words:
                rank = freq_map.get(w.lemma.strip().lower(), 99999)
                norm_lvl, native_lvl = rank_to_cefr(rank, framework)
                if w.normalized_level != norm_lvl or w.native_level != native_lvl or w.frequency_rank != (rank if rank != 99999 else None):
                    w.normalized_level = norm_lvl
                    w.native_level = native_lvl
                    w.frequency_rank = rank if rank != 99999 else None
                    updated_count += 1

            await session.commit()
            logger.info(f"[{lang.code.upper()}] Recalculated {updated_count} / {len(words)} words.")

if __name__ == "__main__":
    asyncio.run(recalculate_all_levels())
