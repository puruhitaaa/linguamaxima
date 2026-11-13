
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import enforce_generation_rate_limit
from app.models import CEFRLevel
from app.schemas import (
    FavoriteToggleResponse,
    StoryCompleteResponse,
    StoryDetailResponse,
    StoryGenerateRequest,
    StoryListItemResponse,
)
from app.services import story_service

router = APIRouter(prefix="/stories", tags=["Stories"])

@router.get("", response_model=list[StoryListItemResponse])
async def list_stories(
    response: Response,
    cefr_level: CEFRLevel | None = Query(None, description="Filter by CEFR level (A1-C2)"),
    category_slug: str | None = Query(None, description="Filter by category slug"),
    search: str | None = Query(None, description="Search by title or keyword"),
    origin_language_code: str | None = Query(None, description="Filter by origin language code"),
    target_language_code: str | None = Query(None, description="Filter by target language code"),
    is_favorite: bool | None = Query(None, description="Filter by favorite status"),
    is_completed: bool | None = Query(None, description="Filter by completed status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await story_service.list_stories(
        session=db,
        cefr_level=cefr_level,
        category_slug=category_slug,
        search=search,
        origin_language_code=origin_language_code,
        target_language_code=target_language_code,
        is_favorite=is_favorite,
        is_completed=is_completed,
        page=page,
        limit=limit,
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Limit"] = str(limit)
    return items

@router.get("/{story_id}", response_model=StoryDetailResponse)
async def get_story_detail(
    story_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await story_service.get_story_detail(db, story_id)

@router.post(
    "/generate",
    response_model=StoryDetailResponse,
    dependencies=[Depends(enforce_generation_rate_limit)],
)
async def generate_story(
    req: StoryGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    return await story_service.generate_and_save_story(db, req)

@router.patch("/{story_id}/favorite", response_model=FavoriteToggleResponse)
async def toggle_favorite(
    story_id: int,
    db: AsyncSession = Depends(get_db),
):
    is_fav = await story_service.toggle_favorite(db, story_id)
    return FavoriteToggleResponse(story_id=story_id, is_favorite=is_fav)

@router.post("/{story_id}/complete", response_model=StoryCompleteResponse)
async def mark_story_completed(
    story_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await story_service.mark_completed(db, story_id)
