from typing import Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas import (
    WordResponse,
    WordListResponse,
    WordFilterMetaResponse,
    FlashcardResponse,
)
from app.services import dictionary_service, flashcard_service

router = APIRouter(prefix="/words", tags=["Words"])

@router.get("", response_model=WordListResponse)
async def list_words(
    language: str = Query("de", alias="lang", description="Language code, e.g. de, en, ja, zh, id"),
    level: Optional[str] = Query(None, description="Proficiency level filter (e.g. A1, A2, B1, B2, C1, C2)"),
    part_of_speech: Optional[str] = Query(None, alias="pos", description="Part of speech filter (e.g. noun, verb, conjunction)"),
    search: Optional[str] = Query(None, description="Search term for word lemma or translation"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(24, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
):
    return await dictionary_service.list_words(
        session=db,
        language_code=language,
        level=level,
        part_of_speech=part_of_speech,
        search=search,
        page=page,
        page_size=page_size,
    )

@router.get("/filters", response_model=WordFilterMetaResponse)
async def get_word_filters(
    language: str = Query("de", alias="lang", description="Language code"),
    db: AsyncSession = Depends(get_db),
):
    return await dictionary_service.get_filter_meta(session=db, language_code=language)

@router.get("/{word_id}", response_model=WordResponse)
async def get_word_detail(
    word_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
):
    return await dictionary_service.get_word_by_id(session=db, word_id=word_id)

@router.post("/{word_id}/flashcard", response_model=FlashcardResponse)
async def save_word_to_flashcard(
    word_id: int = Path(..., ge=1),
    db: AsyncSession = Depends(get_db),
):
    return await flashcard_service.save_flashcard(session=db, word_id=word_id)
