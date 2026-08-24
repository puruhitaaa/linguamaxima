from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas import ProgressSummaryResponse
from app.services import progress_service

router = APIRouter(prefix="/progress", tags=["Progress"])

@router.get("", response_model=ProgressSummaryResponse)
async def get_progress_summary(db: AsyncSession = Depends(get_db)):
    return await progress_service.get_summary(db)
