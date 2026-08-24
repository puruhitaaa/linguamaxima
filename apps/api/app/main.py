import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import check_db_health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("linguamaxima")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info(
        f"Initializing LinguaMaxima API (Serverless Mode: {settings.is_serverless}, "
        f"Storage: {settings.audio_storage_backend})..."
    )

    # Ensure local media dirs only if local storage is used
    if not settings.is_serverless or settings.audio_storage_backend == "local":
        try:
            settings.media_dir.mkdir(parents=True, exist_ok=True)
            settings.audio_dir.mkdir(parents=True, exist_ok=True)
            settings.images_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Could not create media directories: {e}")

    logger.info("LinguaMaxima API ready.")
    yield
    # Shutdown actions
    logger.info("Shutting down LinguaMaxima API...")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local media static files if directory exists
try:
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/api/v1/media",
        StaticFiles(directory=str(settings.media_dir)),
        name="media",
    )
except Exception as e:
    logger.info(f"Local static media mount skipped (e.g. serverless environment): {e}")

# Include v1 router
app.include_router(api_router)

@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    db_ok = await check_db_health()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "version": settings.app_version,
        "is_serverless": settings.is_serverless,
        "storage_backend": settings.audio_storage_backend,
    }
