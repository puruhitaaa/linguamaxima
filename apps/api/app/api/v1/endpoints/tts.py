from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.tts_service import tts_service

router = APIRouter(prefix="/tts", tags=["TTS"])

class TTSGenerateRequest(BaseModel):
    text: str
    language: str = "de"
    voice: Optional[str] = None

class TTSGenerateResponse(BaseModel):
    audio_url: str

@router.post("/generate", response_model=TTSGenerateResponse)
async def generate_tts(req: TTSGenerateRequest):
    url = await tts_service.generate_audio(
        text=req.text,
        voice=req.voice,
        language=req.language,
    )
    if not url:
        raise HTTPException(status_code=500, detail="Audio generation failed")
    return TTSGenerateResponse(audio_url=url)
