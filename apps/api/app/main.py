import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import check_db_health, get_session_maker, init_db
from app.seeds.seed_data import seed_database

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

    # 1. Ensure local media dirs only if local storage or containerized
    if not settings.is_serverless or settings.audio_storage_backend == "local":
        try:
            settings.media_dir.mkdir(parents=True, exist_ok=True)
            settings.audio_dir.mkdir(parents=True, exist_ok=True)
            settings.images_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Could not create media directories: {e}")

    # 2. Initialize DB & Seed initial data (skipped or idempotent)
    if settings.auto_init_db:
        try:
            await init_db()
        except Exception as e:
            logger.error(f"Error during init_db: {e}")

    if settings.auto_seed_db:
        try:
            session_maker = get_session_maker()
            async with session_maker() as session:
                await seed_database(session)
        except Exception as e:
            logger.error(f"Error during seed_database: {e}")

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

@app.post("/api/v1/init-db", tags=["System"])
@app.get("/api/v1/init-db", tags=["System"])
async def trigger_init_db():
    from urllib.parse import urlparse
    parsed = urlparse(settings.database_url)
    masked_host = f"{parsed.hostname}:{parsed.port}/{parsed.path.lstrip('/')}" if parsed.hostname else "local"

    try:
        import traceback
        from sqlalchemy import func, select, text
        from app.core.database import Base, get_engine, get_session_maker, init_db
        import app.models as models
        from app.seeds.seed_data import seed_database

        # 1. Run schema creation
        await init_db()

        # 2. Check actual tables in database
        engine = get_engine()
        async with engine.connect() as conn:
            if "sqlite" in settings.database_url:
                res = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                db_tables = [row[0] for row in res.fetchall()]
            else:
                res = await conn.execute(
                    text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
                )
                db_tables = [row[0] for row in res.fetchall()]

        # 3. Seed data
        session_maker = get_session_maker()
        async with session_maker() as session:
            await seed_database(session)

            lang_count = (
                await session.execute(select(func.count()).select_from(models.Language))
            ).scalar()
            cat_count = (
                await session.execute(select(func.count()).select_from(models.Category))
            ).scalar()
            story_count = (
                await session.execute(select(func.count()).select_from(models.Story))
            ).scalar()

        return {
            "actual_tables_in_db": db_tables,
            "connected_database": masked_host,
            "counts": {
                "categories": cat_count,
                "languages": lang_count,
                "stories": story_count,
            },
            "message": "Database initialized and seeded successfully",
            "registered_models": list(Base.metadata.tables.keys()),
            "status": "success",
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Manual DB initialization failed: {e}\n{tb}")
        return {
            "connected_database": masked_host,
            "detail": str(e),
            "status": "error",
            "traceback": tb,
        }
