from typing import List, Optional
from fastapi import APIRouter, Depends, Query
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

@router.get("", response_model=List[FlashcardResponse])
async def list_all_flashcards(
    search: Optional[str] = Query(None, description="Search vocabulary word or translation"),
    db: AsyncSession = Depends(get_db),
):
    return await flashcard_service.get_all_flashcards(db, search=search)

@router.get("/due", response_model=List[FlashcardResponse])
async def list_due_flashcards(db: AsyncSession = Depends(get_db)):
    return await flashcard_service.get_due_flashcards(db)

@router.post("", response_model=FlashcardResponse)
async def save_flashcard(
    req: FlashcardCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    return await flashcard_service.save_flashcard(db, vocabulary_id=req.vocabulary_id, word_id=req.word_id)

@router.patch("/{flashcard_id}/review", response_model=FlashcardReviewResponse)
async def review_flashcard(
    flashcard_id: int,
    req: FlashcardReviewRequest,
    db: AsyncSession = Depends(get_db),
):
    return await flashcard_service.review_flashcard(db, flashcard_id, req.quality)
