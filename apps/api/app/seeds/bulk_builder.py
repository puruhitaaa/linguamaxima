"""
Bulk Multilingual Lexicon Builder
Generates and seeds over 1,500+ curated words across all 13 supported languages
and all 6 proficiency levels (A1..C2 / native scales), ensuring at least 20+ words
per level per language with multiple parts of speech and authentic usage examples.
"""

import asyncio
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import CEFRLevel, Language, Word
from app.core.database import get_session_maker

logger = logging.getLogger("linguamaxima.bulk_builder")

# Generator function to assemble extensive graded vocabulary lists
def get_comprehensive_words_for_language(lang_code: str) -> list[dict]:
    # We will build rich, authentic lists for each language
    # Import or define modular dictionaries
    from app.seeds.lexicon_data import ALL_LEXICONS
    return ALL_LEXICONS.get(lang_code, [])

async def seed_all_bulk_words(session: AsyncSession) -> tuple[int, int]:
    from app.seeds.lexicon_data import ALL_LEXICONS

    logger.info("Starting massive bulk dictionary database seeding...")

    # Fetch language map
    langs = (await session.execute(select(Language))).scalars().all()
    lang_map = {l.code: l for l in langs}

    total_added = 0
    total_updated = 0

    for lang_code, words in ALL_LEXICONS.items():
        lang = lang_map.get(lang_code)
        if not lang:
            logger.warning(f"Language '{lang_code}' not in DB. Skipping.")
            continue

        # Fetch existing words for this language
        existing_words_stmt = select(Word).where(Word.language_id == lang.id)
        existing_words = (await session.execute(existing_words_stmt)).scalars().all()
        existing_map = {(w.lemma.strip().lower(), w.part_of_speech.strip().lower()): w for w in existing_words}

        words_to_add = []

        for w_data in words:
            key = (w_data["lemma"].strip().lower(), w_data["part_of_speech"].strip().lower())
            existing = existing_map.get(key)

            if not existing:
                word_obj = Word(
                    language_id=lang.id,
                    lemma=w_data["lemma"],
                    normalized_level=w_data["normalized_level"],
                    native_level=w_data.get("native_level"),
                    part_of_speech=w_data["part_of_speech"],
                    gender=w_data.get("gender"),
                    phonetic=w_data.get("phonetic"),
                    translation=w_data["translation"],
                    definition=w_data.get("definition"),
                    example_sentence=w_data.get("example_sentence"),
                    example_translation=w_data.get("example_translation"),
                    frequency_rank=w_data.get("frequency_rank"),
                )
                words_to_add.append(word_obj)
                total_added += 1
            else:
                existing.normalized_level = w_data["normalized_level"]
                existing.native_level = w_data.get("native_level")
                existing.gender = w_data.get("gender")
                existing.phonetic = w_data.get("phonetic")
                existing.translation = w_data["translation"]
                existing.definition = w_data.get("definition")
                existing.example_sentence = w_data.get("example_sentence")
                existing.example_translation = w_data.get("example_translation")
                existing.frequency_rank = w_data.get("frequency_rank")
                total_updated += 1

        if words_to_add:
            session.add_all(words_to_add)

        logger.info(f"[{lang_code.upper()}] Processed {len(words)} entries (+{len(words_to_add)} added, ~{len(words) - len(words_to_add)} updated).")

    await session.commit()
    logger.info(f"Bulk dictionary seeding completed! Added: {total_added}, Updated: {total_updated}")
    return total_added, total_updated

if __name__ == "__main__":
    async def main():
        logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
        session_maker = get_session_maker()
        async with session_maker() as session:
            await seed_all_bulk_words(session)

    asyncio.run(main())
