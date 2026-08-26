from pathlib import Path
from app.models import CEFRLevel
from app.seeds.generate_lexicon_data import GERMAN_LEXICON
from app.seeds.expand_all_languages import EXTRA_MULTILINGUAL_LEXICON
from app.seeds.expand_asian_and_more_lexicons import EXTRA_EXPANSION_DATA
from app.seeds.expand_nl_pt_ru_ar import EXTRA_DATA

def serialize_item(item: dict) -> dict:
    cleaned = dict(item)
    lvl = cleaned.get("normalized_level")
    if isinstance(lvl, CEFRLevel):
        cleaned["normalized_level"] = lvl.value
    elif isinstance(lvl, str):
        cleaned["normalized_level"] = lvl
    return cleaned

def main():
    all_lex = {}

    # 1. German
    all_lex["de"] = [serialize_item(it) for it in GERMAN_LEXICON]

    # 2. English extra
    from app.seeds.generate_all_lexicons import build_data_file
    # Add sources
    for source in [EXTRA_MULTILINGUAL_LEXICON, EXTRA_EXPANSION_DATA, EXTRA_DATA]:
        for lang, items in source.items():
            existing_lemmas = {(w['lemma'], w['part_of_speech']) for w in all_lex.get(lang, [])}
            for item in items:
                clean_item = serialize_item(item)
                key = (clean_item['lemma'], clean_item['part_of_speech'])
                if key not in existing_lemmas:
                    all_lex.setdefault(lang, []).append(clean_item)
                    existing_lemmas.add(key)

    total_words = sum(len(v) for v in all_lex.values())

    seed_code = f'''import logging
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import CEFRLevel, Language, Word
from app.core.database import get_session_maker

logger = logging.getLogger("linguamaxima.dictionary_seed")

CURATED_WORDS: dict[str, list[dict]] = {repr(all_lex)}

async def seed_dictionary(session: AsyncSession) -> None:
    """Seeds bulk comprehensive vocabulary across all 13 supported languages."""
    logger.info("Starting bulk dictionary seeding...")
    lang_stmt = select(Language)
    langs = (await session.execute(lang_stmt)).scalars().all()
    lang_map = {{l.code: l for l in langs}}

    total_added = 0
    total_updated = 0

    for lang_code, words in CURATED_WORDS.items():
        lang = lang_map.get(lang_code)
        if not lang:
            logger.warning(f"Language '{{lang_code}}' not found in database. Skipping...")
            continue

        existing_words = (
            await session.execute(select(Word).where(Word.language_id == lang.id))
        ).scalars().all()
        existing_map = {{(w.lemma.strip().lower(), w.part_of_speech.strip().lower()): w for w in existing_words}}

        words_to_add = []
        for w_data in words:
            key = (w_data["lemma"].strip().lower(), w_data["part_of_speech"].strip().lower())
            existing = existing_map.get(key)
            norm_level = CEFRLevel[w_data["normalized_level"]] if isinstance(w_data["normalized_level"], str) else w_data["normalized_level"]

            if not existing:
                word_obj = Word(
                    language_id=lang.id,
                    lemma=w_data["lemma"],
                    normalized_level=norm_level,
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
                existing.normalized_level = norm_level
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

    await session.commit()
    logger.info(f"Dictionary seeding completed! {{total_added}} added, {{total_updated}} updated across {{len(CURATED_WORDS)}} languages.")

if __name__ == "__main__":
    async def main_seed():
        logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
        session_maker = get_session_maker()
        async with session_maker() as session:
            await seed_dictionary(session)

    asyncio.run(main_seed())
'''

    Path("app/seeds/dictionary_seed.py").write_text(seed_code, encoding="utf-8")
    print(f"Unified dictionary_seed.py successfully written with {total_words} clean entries.")

if __name__ == "__main__":
    main()
