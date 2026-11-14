
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas import (
    FlashcardCreateRequest,
    FlashcardResponse,
    FlashcardReviewRequest,
    FlashcardReviewResponse,
)
from app.services import flashcard_service

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])

@router.get("", response_model=list[FlashcardResponse])
async def list_all_flashcards(
    search: str | None = Query(None, description="Search vocabulary word or translation"),
    origin_language_code: str | None = Query(None, description="Filter by origin language code"),
    target_language_code: str | None = Query(None, description="Filter by target language code"),
    db: AsyncSession = Depends(get_db),
):
    return await flashcard_service.get_all_flashcards(
        db,
        search=search,
        origin_language_code=origin_language_code,
        target_language_code=target_language_code,
    )

@router.get("/due", response_model=list[FlashcardResponse])
async def list_due_flashcards(
    origin_language_code: str | None = Query(None, description="Filter by origin language code"),
    target_language_code: str | None = Query(None, description="Filter by target language code"),
    db: AsyncSession = Depends(get_db),
):
    return await flashcard_service.get_due_flashcards(
        db,
        origin_language_code=origin_language_code,
        target_language_code=target_language_code,
    )

@router.post("", response_model=FlashcardResponse)
async def save_flashcard(
    req: FlashcardCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    return await flashcard_service.save_flashcard(
        db,
        vocabulary_id=req.vocabulary_id,
        word_id=req.word_id,
        journey_vocabulary_id=req.journey_vocabulary_id,
    )

@router.patch("/{flashcard_id}/review", response_model=FlashcardReviewResponse)
async def review_flashcard(
    flashcard_id: int,
    req: FlashcardReviewRequest,
    db: AsyncSession = Depends(get_db),
):
    return await flashcard_service.review_flashcard(db, flashcard_id, req.quality)

@router.delete("/{flashcard_id}", status_code=204)
async def delete_flashcard(
    flashcard_id: int,
    db: AsyncSession = Depends(get_db),
):
    await flashcard_service.delete_flashcard(db, flashcard_id)
    return Response(status_code=204)
