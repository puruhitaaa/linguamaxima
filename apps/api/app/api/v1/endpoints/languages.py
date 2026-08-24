from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.repositories import language_repo
from app.schemas import LanguageResponse, LanguagePairResponse, LanguagePairCreateRequest

router = APIRouter(prefix="/languages", tags=["Languages"])

@router.get("", response_model=List[LanguageResponse])
async def list_languages(db: AsyncSession = Depends(get_db)):
    return await language_repo.get_all_languages(db)

@router.get("/pairs", response_model=List[LanguagePairResponse])
async def list_language_pairs(db: AsyncSession = Depends(get_db)):
    return await language_repo.get_all_pairs(db)

@router.post("/pairs", response_model=LanguagePairResponse)
async def create_or_get_pair(req: LanguagePairCreateRequest, db: AsyncSession = Depends(get_db)):
    return await language_repo.get_or_create_pair(db, req.origin_language_code, req.target_language_code)
