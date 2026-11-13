
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import CEFRLevel, JourneyStatus
from app.schemas import (
    FlashcardResponse,
    JourneyBulkFlashcardResponse,
    JourneyClarifyRequest,
    JourneyClarifyResponse,
    JourneyDetailResponse,
    JourneyGenerateRequest,
    JourneyListItemResponse,
    JourneyPinToggleResponse,
    JourneyPromptPreviewRequest,
    JourneyPromptPreviewResponse,
    JourneyStepCompleteRequest,
    JourneyStepCompleteResponse,
    JourneyStepPrepareResponse,
)
from app.services.journey_service import journey_service

router = APIRouter(prefix="/journeys", tags=["Learning Journeys"])


@router.post("/clarify", response_model=JourneyClarifyResponse)
async def clarify_learning_purpose(
    req: JourneyClarifyRequest,
    db: AsyncSession = Depends(get_db),
):
    return await journey_service.clarify_purpose(db, req)


@router.post("/preview-prompt", response_model=JourneyPromptPreviewResponse)
async def preview_synthesized_prompt(
    req: JourneyPromptPreviewRequest,
    db: AsyncSession = Depends(get_db),
):
    return await journey_service.preview_prompt(db, req)


@router.post("/generate", response_model=JourneyDetailResponse)
async def generate_learning_journey(
    req: JourneyGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    return await journey_service.generate_journey(db, req)


@router.get("", response_model=list[JourneyListItemResponse])
async def list_learning_journeys(
    search: str | None = Query(None, description="Search by title, goal, sector, or vocabulary"),
    target_language_code: str | None = Query(None, description="Filter by target language code"),
    origin_language_code: str | None = Query(None, description="Filter by origin language code"),
    cefr_level: CEFRLevel | None = Query(None, description="Filter by CEFR level"),
    journey_status: JourneyStatus | None = Query(None, alias="status", description="Filter by status"),
    is_pinned: bool | None = Query(None, description="Filter by pinned state"),
    sort_by: str = Query(
        "recent",
        description="Sort order: recent, progress_desc, progress_asc, newest, oldest, level_asc, level_desc, title_asc",
    ),
    db: AsyncSession = Depends(get_db),
):
    return await journey_service.list_journeys(
        session=db,
        search=search,
        target_language_code=target_language_code,
        origin_language_code=origin_language_code,
        cefr_level=cefr_level,
        status=journey_status,
        is_pinned=is_pinned,
        sort_by=sort_by,
    )


@router.get("/{journey_id}", response_model=JourneyDetailResponse)
async def get_learning_journey_detail(
    journey_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await journey_service.get_journey_detail(db, journey_id)


@router.patch("/{journey_id}/activate", response_model=JourneyListItemResponse)
async def activate_learning_journey(
    journey_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await journey_service.activate_journey(db, journey_id)


@router.patch("/{journey_id}/pin", response_model=JourneyPinToggleResponse)
async def toggle_pin_journey(
    journey_id: int,
    db: AsyncSession = Depends(get_db),
):
    pinned = await journey_service.toggle_pin(db, journey_id)
    return JourneyPinToggleResponse(journey_id=journey_id, is_pinned=pinned)


@router.delete("/{journey_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_learning_journey(
    journey_id: int,
    db: AsyncSession = Depends(get_db),
):
    await journey_service.delete_journey(db, journey_id)


@router.post("/{journey_id}/steps/{step_id}/prepare", response_model=JourneyStepPrepareResponse)
async def prepare_journey_step(
    journey_id: int,
    step_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await journey_service.prepare_step(db, journey_id, step_id)


@router.post("/{journey_id}/steps/{step_id}/complete", response_model=JourneyStepCompleteResponse)
async def complete_journey_step(
    journey_id: int,
    step_id: int,
    req: JourneyStepCompleteRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    return await journey_service.complete_step(
        db, journey_id, step_id, req or JourneyStepCompleteRequest()
    )


@router.post("/vocab/{vocab_id}/flashcard", response_model=FlashcardResponse)
async def save_journey_vocab_flashcard(
    vocab_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await journey_service.save_vocab_to_flashcard(db, vocab_id)


@router.post("/{journey_id}/steps/{step_id}/flashcards/bulk", response_model=JourneyBulkFlashcardResponse)
async def save_step_vocabs_bulk(
    journey_id: int,
    step_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await journey_service.save_step_vocabs_bulk(db, journey_id, step_id)
