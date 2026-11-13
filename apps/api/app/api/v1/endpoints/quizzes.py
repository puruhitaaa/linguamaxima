from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas import (
    QuestionResult,
    QuizSubmissionItem,
    QuizSubmissionRequest,
    QuizSubmissionResponse,
)
from app.services import quiz_service

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])

@router.post("/{story_id}/check", response_model=QuestionResult)
async def check_quiz_answer(
    story_id: int,
    req: QuizSubmissionItem,
    db: AsyncSession = Depends(get_db),
):
    return await quiz_service.check_answer(db, story_id, req)

@router.post("/{story_id}/submit", response_model=QuizSubmissionResponse)
async def submit_quiz(
    story_id: int,
    req: QuizSubmissionRequest,
    db: AsyncSession = Depends(get_db),
):
    return await quiz_service.submit_quiz(db, story_id, req)
