from fastapi import APIRouter
from app.api.v1.endpoints import (
    categories,
    flashcards,
    languages,
    progress,
    quizzes,
    stories,
    tts,
    words,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(stories.router)
api_router.include_router(categories.router)
api_router.include_router(languages.router)
api_router.include_router(words.router)
api_router.include_router(flashcards.router)
api_router.include_router(quizzes.router)
api_router.include_router(progress.router)
api_router.include_router(tts.router)
