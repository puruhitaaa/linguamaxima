from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models import CEFRLevel
from app.schemas import (
    FavoriteToggleResponse,
    StoryDetailResponse,
    StoryGenerateRequest,
    StoryListItemResponse,
)
from app.services import story_service

router = APIRouter(prefix="/stories", tags=["Stories"])

@router.get("", response_model=List[StoryListItemResponse])
async def list_stories(
    cefr_level: Optional[CEFRLevel] = Query(None, description="Filter by CEFR level (A1-C2)"),
    category_slug: Optional[str] = Query(None, description="Filter by category slug"),
    search: Optional[str] = Query(None, description="Search by title or keyword"),
    origin_language_code: Optional[str] = Query(None, description="Filter by origin language code"),
    target_language_code: Optional[str] = Query(None, description="Filter by target language code"),
    is_favorite: Optional[bool] = Query(None, description="Filter by favorite status"),
    is_completed: Optional[bool] = Query(None, description="Filter by completed status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, _ = await story_service.list_stories(
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
    return items

@router.get("/{story_id}", response_model=StoryDetailResponse)
async def get_story_detail(
    story_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await story_service.get_story_detail(db, story_id)

@router.post("/generate", response_model=StoryDetailResponse)
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
