"""
Batch Ingest Runner for Multiple Languages.
Streams and loads 1,500 - 2,500 words per language across all supported languages.
"""

import sys
import asyncio
import logging
from app.seeds.kaikki_bulk_ingest import ingest_kaikki_language

# Ensure utf-8
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("linguamaxima.multi_ingest")

LANGUAGES_TO_INGEST = ["es", "fr", "it", "pt", "nl", "ru", "id"]

async def run_all(target_per_lang: int = 1500):
    for lang in LANGUAGES_TO_INGEST:
        logger.info(f"========== Starting Ingestion for {lang.upper()} ==========")
        try:
            await ingest_kaikki_language(lang, target_per_lang)
        except Exception as e:
            logger.error(f"Error ingesting {lang}: {e}")
        logger.info(f"========== Finished Ingestion for {lang.upper()} ==========\n")

if __name__ == "__main__":
    target = 1500
    if len(sys.argv) > 1:
        target = int(sys.argv[1])
    asyncio.run(run_all(target))
