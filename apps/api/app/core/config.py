from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App Metadata
    app_name: str = "LinguaMaxima API"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://linguamaxima:linguamaxima@localhost:5433/linguamaxima"
    sqlite_fallback_url: str = f"sqlite+aiosqlite:///{BASE_DIR}/linguamaxima.db"
    use_sqlite_fallback: bool = True

    # CORS
    cors_origins: Union[List[str], str] = [
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3001", "http://127.0.0.1:3001"]

    # AI Configuration (via LiteLLM)
    default_ai_model: str = "gemini/gemini-2.5-flash"
    fallback_ai_model: str = "groq/llama-4-scout"

    # API Keys
    gemini_api_key: str = ""
    groq_api_key: str = ""
    openai_api_key: str = ""
    pixabay_api_key: str = ""
    pexels_api_key: str = ""

    # TTS Settings
    tts_provider: str = "edge-tts"
    default_target_voice: str = "de-DE-ConradNeural"
    default_origin_voice: str = "id-ID-ArdiNeural"

    # Media Storage
    media_dir: Path = BASE_DIR / "media"
    audio_dir: Path = BASE_DIR / "media" / "audio"
    images_dir: Path = BASE_DIR / "media" / "images"

    # Generation Rate Limit (per minute)
    generation_rate_limit: int = 10

settings = Settings()
