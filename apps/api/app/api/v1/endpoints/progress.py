
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas import ProgressSummaryResponse
from app.services import progress_service

router = APIRouter(prefix="/progress", tags=["Progress"])

@router.get("", response_model=ProgressSummaryResponse)
async def get_progress_summary(
    origin_language_code: str | None = Query(None, description="Filter summary by origin language code"),
    target_language_code: str | None = Query(None, description="Filter summary by target language code"),
    tz_offset_minutes: int = Query(0, ge=-720, le=840, description="Client timezone offset in minutes for streak alignment"),
    db: AsyncSession = Depends(get_db),
):
    return await progress_service.get_summary(
        db,
        origin_language_code=origin_language_code,
        target_language_code=target_language_code,
        tz_offset_minutes=tz_offset_minutes,
    )
