import os
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

    # Serverless & Execution Mode
    is_serverless: bool = bool(
        os.getenv("VERCEL") == "1"
        or os.getenv("AWS_LAMBDA_FUNCTION_NAME")
        or os.getenv("IS_SERVERLESS", "").lower() in ("true", "1")
    )
    auto_init_db: bool = True
    auto_seed_db: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://linguamaxima:linguamaxima@localhost:5433/linguamaxima"
    sqlite_fallback_url: str = f"sqlite+aiosqlite:///{BASE_DIR}/linguamaxima.db"
    use_sqlite_fallback: bool = True
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_use_null_pool: bool = False

    @field_validator("database_url", mode="before")
    @classmethod
    def assemble_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
            if v.startswith("postgresql://") and not v.startswith("postgresql+"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
            if v.startswith("sqlite://") and not v.startswith("sqlite+"):
                return v.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return v

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

    # Storage Backend Configuration ("local" | "r2" | "s3")
    audio_storage_backend: str = "local"
    
    # Cloudflare R2 / S3 Configuration
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "linguamaxima-audio"
    r2_public_url_prefix: str = ""  # e.g., "https://pub-xxx.r2.dev" or custom domain

    # Local Media Storage
    media_dir: Path = BASE_DIR / "media"
    audio_dir: Path = BASE_DIR / "media" / "audio"
    images_dir: Path = BASE_DIR / "media" / "images"

    # Generation Rate Limit (per minute)
    generation_rate_limit: int = 10

settings = Settings()
