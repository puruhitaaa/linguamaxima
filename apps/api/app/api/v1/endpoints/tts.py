
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.rate_limit import enforce_generation_rate_limit
from app.services.tts_service import tts_service

router = APIRouter(prefix="/tts", tags=["TTS"])

class TTSGenerateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    language: str = "de"
    voice: str | None = None

class TTSGenerateResponse(BaseModel):
    audio_url: str

@router.post(
    "/generate",
    response_model=TTSGenerateResponse,
    dependencies=[Depends(enforce_generation_rate_limit)],
)
async def generate_tts(req: TTSGenerateRequest):
    url = await tts_service.generate_audio(
        text=req.text,
        voice=req.voice,
        language=req.language,
    )
    if not url:
        raise HTTPException(status_code=500, detail="Audio generation failed")
    return TTSGenerateResponse(audio_url=url)
