import logging
import math
from typing import Optional, Tuple, List
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import CEFRLevel
from app.repositories import word_repo, flashcard_repo
from app.schemas import (
    WordResponse,
    WordListResponse,
    WordFilterMetaResponse,
    FilterCountItem,
)

logger = logging.getLogger("linguamaxima.dictionary")

class DictionaryService:
    async def list_words(
        self,
        session: AsyncSession,
        language_code: Optional[str] = "de",
        level: Optional[str] = None,
        part_of_speech: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 24,
    ) -> WordListResponse:
        offset = (page - 1) * page_size
        
        cefr_level = None
        if level and level.upper() in [l.value for l in CEFRLevel]:
            cefr_level = CEFRLevel(level.upper())

        words, total = await word_repo.list_words(
            session=session,
            language_code=language_code,
            normalized_level=cefr_level,
            part_of_speech=part_of_speech,
            search=search,
            limit=page_size,
            offset=offset,
        )

        # Check saved flashcards
        all_flashcards = await flashcard_repo.get_all_flashcards(session)
        saved_word_ids = {fc.word_id for fc in all_flashcards if fc.word_id is not None}

        items = [
            WordResponse(
                id=w.id,
                language_id=w.language_id,
                lemma=w.lemma,
                normalized_level=w.normalized_level,
                native_level=w.native_level,
                part_of_speech=w.part_of_speech,
                gender=w.gender,
                phonetic=w.phonetic,
                translation=w.translation,
                definition=w.definition,
                example_sentence=w.example_sentence,
                example_translation=w.example_translation,
                audio_url=w.audio_url,
                frequency_rank=w.frequency_rank,
                is_saved_as_flashcard=(w.id in saved_word_ids),
                created_at=w.created_at,
            )
            for w in words
        ]

        total_pages = max(1, math.ceil(total / page_size))

        return WordListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_filter_meta(
        self, session: AsyncSession, language_code: str = "de"
    ) -> WordFilterMetaResponse:
        meta = await word_repo.get_filter_meta(session, language_code)
        if not meta:
            raise HTTPException(status_code=404, detail="Language not found or has no words")

        return WordFilterMetaResponse(
            language_code=meta["language_code"],
            language_name=meta["language_name"],
            proficiency_framework=meta["proficiency_framework"],
            total_words=meta["total_words"],
            levels=[FilterCountItem(**l) for l in meta["levels"]],
            parts_of_speech=[FilterCountItem(**p) for p in meta["parts_of_speech"]],
        )

    async def get_word_by_id(self, session: AsyncSession, word_id: int) -> WordResponse:
        word = await word_repo.get_by_id(session, word_id)
        if not word:
            raise HTTPException(status_code=404, detail="Word not found")

        all_flashcards = await flashcard_repo.get_all_flashcards(session)
        saved_word_ids = {fc.word_id for fc in all_flashcards if fc.word_id is not None}

        return WordResponse(
            id=word.id,
            language_id=word.language_id,
            lemma=word.lemma,
            normalized_level=word.normalized_level,
            native_level=word.native_level,
            part_of_speech=word.part_of_speech,
            gender=word.gender,
            phonetic=word.phonetic,
            translation=word.translation,
            definition=word.definition,
            example_sentence=word.example_sentence,
            example_translation=word.example_translation,
            audio_url=word.audio_url,
            frequency_rank=word.frequency_rank,
            is_saved_as_flashcard=(word.id in saved_word_ids),
            created_at=word.created_at,
        )

    async def save_word_to_flashcard(self, session: AsyncSession, word_id: int):
        word = await word_repo.get_by_id(session, word_id)
        if not word:
            raise HTTPException(status_code=404, detail="Word not found")

        fc = await flashcard_repo.save_word_to_flashcard(session, word_id)
        loaded = await flashcard_repo.get_by_id(session, fc.id)
        return loaded

dictionary_service = DictionaryService()
